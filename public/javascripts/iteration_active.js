function DraggableStories() {
  // add some guidance
  $('ol.stories').before('<div class="guidance"><p>Drag stories to set their statuses</p></div>');

  this.labelColumns();
  this.create();
  
  // handle resize event
  $(window).resize(this.create);
}
DraggableStories.prototype = {
  create: function() {
    // size div
    $('#stories').width($(window).width() - 430);

    // remove all existing JSy elements
    $('#draggables_container').remove();

    // make a container for all draggables
    $('ol.stories').before('<div id="draggables_container"></div>');

    var container = $('#draggables_container');

    // make draggable container for each form
    $('ol.stories form').each( function() {
      container.append('<div id="draggables_for_'+this.id+'" class="draggables"></div>');
    });

    // make droppables for each radio button
    $('input[name="story[status]"]').each( function() { new DroppableStatus(this) } );
  },

  // make headings based on first set of labels
  labelColumns: function() {
    var html = '<div id="headings"><ol>';

    $($('form.edit_story')[0]).find('label').each( function() {
      var content = $(this).html();
      var label_for = $(this).attr('for');
      var class_name = $('#'+label_for).val();

      html += '<li class="'+class_name+'">'+content+'</li>';
    });
    html += '</ol></div>';

    $('ol.stories').before(html);
  }
}

function DraggableStory(droppable_status) {
  this.input = droppable_status.input;
  this.droppable = droppable_status.droppable;

  var content = droppable_status.li.find('.content');
  var acceptance_criteria = droppable_status.li.find('.acceptance_criteria');
  var container = droppable_status.container;
  var status = droppable_status.status;

  droppable_position = this.droppable.position();
  this.droppable.addClass('ui-state-highlight');

  container.append('<div class="story" id="draggable_'+
      this.input.id+
      '"><div class="content">'+
      content.html()+
      '</div></div>');

  this.element = $('#draggable_' + this.input.id);

  if (acceptance_criteria[0]) {
    this.element.find('.content').append('<div class="acceptance_criteria">'+
        acceptance_criteria.html()+
        '</div>');
  }

  this.element.draggable({ 
      revert: 'invalid',
      axis: 'x', 
      containment: 'parent',
      cursor: 'pointer'
    })
    .css('position', 'absolute')
    .css('top', droppable_position.top)
    .css('left', droppable_position.left)
    .width(this.droppable.width()+2);

  DraggableStory.setStatus(this.element, status);
}
DraggableStory.setStatus = function(element, status) {
  element.removeClass('pending');
  element.removeClass('in_progress');
  element.removeClass('testing');
  element.removeClass('complete');
  element.addClass(status);
}

function DroppableStatus(input) {
  var instance = this;
  this.input = input;
  this.form = $(this.input).parents('form');
  this.container = $('#draggables_for_'+this.form.attr('id'));
  this.li = $(this.input).parents('li');
  this.status = $(this.input).val();

  this.container.append('<div class="'+this.status+'" id="droppable_' + this.input.id + '"></div>');

  this.droppable = $('#droppable_' + this.input.id)
    .droppable({ 
      drop: function(ev, ui) { 
        var id_parts = instance.input.id.split('_');
        var story_id = id_parts[id_parts.length - 1];

        // check the radio button
        $('li#story_'+story_id+' ol input').val([instance.status]);

        // send the request
        instance.form.ajaxSubmit({
          success: function() {
            if (DroppableStatus.previous_statuses[story_id] == 'complete' || instance.status == 'complete') {
              var location_parts = location.href.split('/');
              var iteration_id = location_parts[location_parts.length - 1];
              $('#burndown img').attr('src',
                                      '/iterations/' + iteration_id +
                                      '/burndown?' + new Date().getTime());
            }

            DroppableStatus.previous_statuses[story_id] = instance.status;
          }
        });
        
        // change class of elements
        var draggable = instance.container.find('.ui-draggable');
        DraggableStory.setStatus(draggable, instance.status);

        // custom snapping
        $(ui.draggable).css('left', $(this).position().left);
      }
    });

  // make a draggable if button is checked
  if ($(this.input).attr('checked')) {
    new DraggableStory(this); 
  }
}

DroppableStatus.previous_statuses = {};
