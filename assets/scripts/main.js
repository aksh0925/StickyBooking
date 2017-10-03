function scrollToAnchor(aid){
  var aTag = $("a[name='"+ aid +"']");
    $('html,body').animate({scrollTop: aTag.offset().top},'slow');
  }


// define each pane as a var
var paneTimeSlots = ".available-times";
var paneCustomerInformation = ".pane-customer-information";


$(".get-started").click(function() {
  scrollToAnchor('step-1-scroller');
  $("#booking-process-status .booking-step-1").addClass("booking-step-complete").removeClass("booking-step-active");
  $("#booking-process-status .booking-step-2").addClass("booking-step-active");
});

$(".calendar-dates td").click(function() {
  $(paneTimeSlots).hide();
  $(".calendar-dates td").removeClass("selected-date");
  $(this).addClass("selected-date");
  $(paneTimeSlots).fadeIn();
  scrollToAnchor('time-slot-scroll');
  $("#booking-process-status .booking-step-1").addClass("booking-step-complete").removeClass("booking-step-active");
  $("#booking-process-status .booking-step-2").addClass("booking-step-active");
  $("#booking-process-status .booking-step-2").addClass("booking-step-complete").removeClass("booking-step-active");
  $("#booking-process-status .booking-step-3").addClass("booking-step-active");
});

$(".time-slot-buttons button").click(function() {
  event.preventDefault();
  $(".pane-spacer-helper").hide();
  $(".time-slot-buttons button").removeClass("time-slot-active");
  $(this).addClass("time-slot-active");
  $(paneCustomerInformation).addClass("step-visible");
  scrollToAnchor('customer-info-pane-scroller');
  $("#booking-process-status .booking-step-3").addClass("booking-step-complete").removeClass("booking-step-active");
  $("#booking-process-status .booking-step-4").addClass("booking-step-active");
});
