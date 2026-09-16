// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Miqat';

  @override
  String get homeKicker => 'Booking & deposits';

  @override
  String get homeTitle => 'Book your appointment in a minute';

  @override
  String get homeSubtitle =>
      'Pick a service, choose a time, and secure it with a deposit — no back-and-forth messages.';

  @override
  String get homeCta => 'Book now';

  @override
  String get stepService => 'Service';

  @override
  String get stepSlot => 'Time';

  @override
  String get stepDetails => 'Details';

  @override
  String get stepPayment => 'Payment';

  @override
  String get loadingServices => 'Loading services…';

  @override
  String get loadingSlots => 'Loading available times…';

  @override
  String get noSlots => 'No times available this day — try another date.';

  @override
  String get minutesShort => 'min';

  @override
  String get depositOf => 'deposit';

  @override
  String get back => 'Back';

  @override
  String get namePlaceholder => 'Full name';

  @override
  String get emailPlaceholder => 'Email';

  @override
  String get phonePlaceholder => 'Phone (optional)';

  @override
  String get redirecting => 'Opening payment…';

  @override
  String get payDeposit => 'Pay deposit ·';

  @override
  String get slotTaken => 'That time was just taken — pick another.';

  @override
  String get submitError => 'Couldn\'t create the booking. Try again.';

  @override
  String get couldNotOpenPayment => 'Couldn\'t open the payment page.';

  @override
  String get contactMessagePlaceholder => 'How can we help?';

  @override
  String get contactSend => 'Send message';

  @override
  String get contactSending => 'Sending…';

  @override
  String get contactSent => 'Thanks — we\'ll get back to you soon.';

  @override
  String get contactError => 'Couldn\'t send that. Try again.';

  @override
  String get addressLabel => 'Where should we come to?';

  @override
  String get addressPlaceholder => 'Your address';

  @override
  String get confirmLocation => 'Confirm location';

  @override
  String get useCurrentLocation => 'Use my current location';

  @override
  String get eitherAtYourPlace => 'At the business';

  @override
  String get eitherAtMyAddress => 'At my address';

  @override
  String get continueToPayment => 'Continue to payment';

  @override
  String get choosePaymentMethod => 'Choose how to pay';

  @override
  String get manualPaymentTitle => 'Complete your payment';

  @override
  String get manualPaymentSubtitle =>
      'Follow the instructions below, then upload proof of your transfer.';

  @override
  String get manualPaymentUploadProof => 'Upload payment proof';

  @override
  String get manualPaymentReferencePlaceholder => 'Reference number (optional)';

  @override
  String get manualPaymentUploading => 'Uploading…';

  @override
  String get manualPaymentSubmit => 'Submit';

  @override
  String get manualPaymentSubmitError => 'Couldn\'t submit that — try again.';

  @override
  String get manualPaymentSubmitted =>
      'Thanks! We\'ll confirm your booking shortly.';

  @override
  String get manualPaymentBookingReference => 'Booking reference';
}
