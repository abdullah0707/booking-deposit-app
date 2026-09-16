import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'Miqat'**
  String get appName;

  /// No description provided for @homeKicker.
  ///
  /// In en, this message translates to:
  /// **'Booking & deposits'**
  String get homeKicker;

  /// No description provided for @homeTitle.
  ///
  /// In en, this message translates to:
  /// **'Book your appointment in a minute'**
  String get homeTitle;

  /// No description provided for @homeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Pick a service, choose a time, and secure it with a deposit — no back-and-forth messages.'**
  String get homeSubtitle;

  /// No description provided for @homeCta.
  ///
  /// In en, this message translates to:
  /// **'Book now'**
  String get homeCta;

  /// No description provided for @stepService.
  ///
  /// In en, this message translates to:
  /// **'Service'**
  String get stepService;

  /// No description provided for @stepSlot.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get stepSlot;

  /// No description provided for @stepDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get stepDetails;

  /// No description provided for @stepPayment.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get stepPayment;

  /// No description provided for @loadingServices.
  ///
  /// In en, this message translates to:
  /// **'Loading services…'**
  String get loadingServices;

  /// No description provided for @loadingSlots.
  ///
  /// In en, this message translates to:
  /// **'Loading available times…'**
  String get loadingSlots;

  /// No description provided for @noSlots.
  ///
  /// In en, this message translates to:
  /// **'No times available this day — try another date.'**
  String get noSlots;

  /// No description provided for @minutesShort.
  ///
  /// In en, this message translates to:
  /// **'min'**
  String get minutesShort;

  /// No description provided for @depositOf.
  ///
  /// In en, this message translates to:
  /// **'deposit'**
  String get depositOf;

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get back;

  /// No description provided for @namePlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get namePlaceholder;

  /// No description provided for @emailPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailPlaceholder;

  /// No description provided for @phonePlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Phone (optional)'**
  String get phonePlaceholder;

  /// No description provided for @redirecting.
  ///
  /// In en, this message translates to:
  /// **'Opening payment…'**
  String get redirecting;

  /// No description provided for @payDeposit.
  ///
  /// In en, this message translates to:
  /// **'Pay deposit ·'**
  String get payDeposit;

  /// No description provided for @slotTaken.
  ///
  /// In en, this message translates to:
  /// **'That time was just taken — pick another.'**
  String get slotTaken;

  /// No description provided for @submitError.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t create the booking. Try again.'**
  String get submitError;

  /// No description provided for @couldNotOpenPayment.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t open the payment page.'**
  String get couldNotOpenPayment;

  /// No description provided for @contactMessagePlaceholder.
  ///
  /// In en, this message translates to:
  /// **'How can we help?'**
  String get contactMessagePlaceholder;

  /// No description provided for @contactSend.
  ///
  /// In en, this message translates to:
  /// **'Send message'**
  String get contactSend;

  /// No description provided for @contactSending.
  ///
  /// In en, this message translates to:
  /// **'Sending…'**
  String get contactSending;

  /// No description provided for @contactSent.
  ///
  /// In en, this message translates to:
  /// **'Thanks — we\'ll get back to you soon.'**
  String get contactSent;

  /// No description provided for @contactError.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t send that. Try again.'**
  String get contactError;

  /// No description provided for @addressLabel.
  ///
  /// In en, this message translates to:
  /// **'Where should we come to?'**
  String get addressLabel;

  /// No description provided for @addressPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Your address'**
  String get addressPlaceholder;

  /// No description provided for @confirmLocation.
  ///
  /// In en, this message translates to:
  /// **'Confirm location'**
  String get confirmLocation;

  /// No description provided for @useCurrentLocation.
  ///
  /// In en, this message translates to:
  /// **'Use my current location'**
  String get useCurrentLocation;

  /// No description provided for @eitherAtYourPlace.
  ///
  /// In en, this message translates to:
  /// **'At the business'**
  String get eitherAtYourPlace;

  /// No description provided for @eitherAtMyAddress.
  ///
  /// In en, this message translates to:
  /// **'At my address'**
  String get eitherAtMyAddress;

  /// No description provided for @continueToPayment.
  ///
  /// In en, this message translates to:
  /// **'Continue to payment'**
  String get continueToPayment;

  /// No description provided for @choosePaymentMethod.
  ///
  /// In en, this message translates to:
  /// **'Choose how to pay'**
  String get choosePaymentMethod;

  /// No description provided for @manualPaymentTitle.
  ///
  /// In en, this message translates to:
  /// **'Complete your payment'**
  String get manualPaymentTitle;

  /// No description provided for @manualPaymentSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Follow the instructions below, then upload proof of your transfer.'**
  String get manualPaymentSubtitle;

  /// No description provided for @manualPaymentUploadProof.
  ///
  /// In en, this message translates to:
  /// **'Upload payment proof'**
  String get manualPaymentUploadProof;

  /// No description provided for @manualPaymentReferencePlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Reference number (optional)'**
  String get manualPaymentReferencePlaceholder;

  /// No description provided for @manualPaymentUploading.
  ///
  /// In en, this message translates to:
  /// **'Uploading…'**
  String get manualPaymentUploading;

  /// No description provided for @manualPaymentSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get manualPaymentSubmit;

  /// No description provided for @manualPaymentSubmitError.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t submit that — try again.'**
  String get manualPaymentSubmitError;

  /// No description provided for @manualPaymentSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Thanks! We\'ll confirm your booking shortly.'**
  String get manualPaymentSubmitted;

  /// No description provided for @manualPaymentBookingReference.
  ///
  /// In en, this message translates to:
  /// **'Booking reference'**
  String get manualPaymentBookingReference;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
