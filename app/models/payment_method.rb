class PaymentMethod < ActiveRecord::Base
  attr_accessor :cardholder_name
  attr_accessor :verification_value
  attr_accessor :card_type
  attr_reader :number

  belongs_to :billing_address
  accepts_nested_attributes_for :billing_address
  belongs_to :user
  belongs_to :organisation
  belongs_to :initial_payment, :class_name => 'Payment'

  CARD_TYPES = ['mastercard', 'visa']
  SHARED_ATTRIBUTES = [
    :number,
    :month,
    :year,
    :verification_value,
  ]
  SHARED_VALIDATION_ATTRIBUTES = [
    :number,
    :verification_value,
  ]

  validates_presence_of(:number,
                        :card_type, 
                        :cardholder_name, 
                        :verification_value, 
                        :month,
                        :year)

  validates_inclusion_of :card_type, :in => CARD_TYPES,
    :unless => Proc.new {|payment_method| payment_method.card_type.blank? }

  def validate
    if !credit_card.valid?
      SHARED_VALIDATION_ATTRIBUTES.each do |attribute_name|
        value = send(attribute_name)
        if !value.blank? && message = credit_card.errors.on(attribute_name)
          errors.add(attribute_name, message)
        end
      end
    end

    if (!errors.invalid?(:month) &&
        (credit_card.errors.on(:year) || credit_card.expired?))
      errors.add(:month, :expired) 
    end
  end

  def before_create
    set_last_four_digits
    authorise_initial_payment
  end

  def year=(value)
    return value if value.blank?

    integer = value.to_i
    if integer < 100
      super 2000 + integer
    else
      super integer
    end
  end

  def number=(value)
    @number = value.to_s.gsub(' ', '')
  end

  def has_expired?
    today = Date.today
    Date.new(year, month) < Date.new(today.year, today.month)
  end

  def credit_card
    @credit_card ||= create_credit_card
  end

  def create_credit_card
    card = ActiveMerchant::Billing::CreditCard.new

    SHARED_ATTRIBUTES.each do |attribute_name|
      card.send("#{attribute_name}=", send(attribute_name))
    end

    card.type = card_type

    (card.first_name, card.last_name) = 
      cardholder_name.split(/\s/, 2) if cardholder_name

    card
  end

  def authorise_initial_payment
    authorisation = Authorisation.create!(:payment_method => self, 
                                          :amount => 100)
    if ! authorisation.successful?
      errors.add_to_base(:credit_card_rejected)
      return false
    end
    self.initial_payment = authorisation.payment
  end

  protected

  def set_last_four_digits
    self.last_four_digits = credit_card.last_digits if credit_card
  end
end
