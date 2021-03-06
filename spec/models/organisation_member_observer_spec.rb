require File.expand_path(File.dirname(__FILE__) + '/../spec_helper')

describe OrganisationMemberObserver do
  before :each do
    @sponsor = Users.create_user!
    @organisation = Organisations.create_organisation!
    @user = Users.create_user!
    @organisation_member =
      @organisation.members.build(:user => @user, :sponsor => @sponsor)
  end

  it "should send an authorisation email" do
    OrganisationMember.with_observers(:organisation_member_observer) do
      UserMailer.should_receive(:deliver_acknowledgement).
        with(@organisation_member)
      @organisation_member.save
    end
  end

  it "should not send an email if the sponsor is nil" do
    OrganisationMember.with_observers(:organisation_member_observer) do
      UserMailer.should_not_receive(:deliver_acknowledgement).
        with(@organisation_member)
      @organisation_member.sponsor = nil
      @organisation_member.save
    end
  end
end
