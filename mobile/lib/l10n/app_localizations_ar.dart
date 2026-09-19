// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'ميقات';

  @override
  String get homeKicker => 'حجز وعربون';

  @override
  String get homeTitle => 'احجز موعدك في دقيقة واحدة';

  @override
  String get homeSubtitle =>
      'اختر الخدمة والوقت المناسب، وأكّد حجزك بعربون — من غير رسائل كتير.';

  @override
  String get homeCta => 'احجز الآن';

  @override
  String get stepService => 'الخدمة';

  @override
  String get stepSlot => 'الوقت';

  @override
  String get stepDetails => 'بياناتك';

  @override
  String get stepPayment => 'الدفع';

  @override
  String get loadingServices => 'جاري تحميل الخدمات…';

  @override
  String get loadingSlots => 'جاري تحميل الأوقات المتاحة…';

  @override
  String get noSlots => 'مفيش أوقات متاحة اليوم ده — جرب يوم تاني.';

  @override
  String get minutesShort => 'دقيقة';

  @override
  String get depositOf => 'عربون';

  @override
  String get back => 'رجوع';

  @override
  String get namePlaceholder => 'الاسم بالكامل';

  @override
  String get emailPlaceholder => 'البريد الإلكتروني';

  @override
  String get phonePlaceholder => 'رقم الهاتف (اختياري)';

  @override
  String get redirecting => 'جاري فتح صفحة الدفع…';

  @override
  String get payDeposit => 'ادفع العربون ·';

  @override
  String get slotTaken => 'الوقت ده اتحجز لتوه — اختار وقت تاني.';

  @override
  String get submitError => 'تعذّر إنشاء الحجز، جرب تاني.';

  @override
  String get couldNotOpenPayment => 'تعذّر فتح صفحة الدفع.';

  @override
  String get contactMessagePlaceholder => 'إزاي نقدر نساعدك؟';

  @override
  String get contactSend => 'إرسال';

  @override
  String get contactSending => 'جاري الإرسال…';

  @override
  String get contactSent => 'شكرًا — هنرد عليك قريب.';

  @override
  String get contactError => 'تعذّر الإرسال، جرب تاني.';

  @override
  String get addressLabel => 'نيجي لك فين؟';

  @override
  String get addressPlaceholder => 'عنوانك';

  @override
  String get confirmLocation => 'تأكيد الموقع';

  @override
  String get useCurrentLocation => 'استخدم موقعي الحالي';

  @override
  String get eitherAtYourPlace => 'عند النشاط';

  @override
  String get eitherAtMyAddress => 'في عنواني';

  @override
  String get continueToPayment => 'كمّل للدفع';

  @override
  String get choosePaymentMethod => 'اختار طريقة الدفع';

  @override
  String get manualPaymentTitle => 'أكمل عملية الدفع';

  @override
  String get manualPaymentSubtitle =>
      'اتبع التعليمات تحت، وبعدين ارفع إثبات التحويل.';

  @override
  String get manualPaymentUploadProof => 'رفع إثبات الدفع';

  @override
  String get manualPaymentReferencePlaceholder => 'الرقم المرجعي (اختياري)';

  @override
  String get manualPaymentUploading => 'جاري الرفع…';

  @override
  String get manualPaymentSubmit => 'إرسال';

  @override
  String get manualPaymentSubmitError => 'تعذّر الإرسال — جرب تاني.';

  @override
  String get manualPaymentSubmitted => 'شكرًا! هنأكد حجزك قريب.';

  @override
  String get manualPaymentBookingReference => 'رقم الحجز';

  @override
  String get passwordPlaceholder => 'كلمة السر';

  @override
  String get accountSignIn => 'دخول';

  @override
  String get accountSigningIn => 'جاري الدخول…';

  @override
  String get accountLoginTitle => 'تسجيل الدخول';

  @override
  String get accountLoginSubtitle =>
      'شوف حجوزاتك السابقة واحجز أسرع في المرة الجاية.';

  @override
  String get accountInvalidCredentials => 'الإيميل أو كلمة السر غلط.';

  @override
  String get accountGenericError => 'حصل خطأ — جرب تاني.';

  @override
  String get accountCreateOne => 'لسه معملتش حساب؟ اعمل واحد';

  @override
  String get accountRegisterTitle => 'إنشاء حساب';

  @override
  String get accountRegisterSubtitle =>
      'احفظ سجل حجوزاتك وماتكتبش بياناتك تاني في المرة الجاية.';

  @override
  String get accountPasswordHint => 'كلمة السر (8 حروف على الأقل)';

  @override
  String get accountEmailTaken => 'في حساب بنفس الإيميل ده موجود بالفعل.';

  @override
  String get accountCreating => 'جاري الإنشاء…';

  @override
  String get accountCreateAccount => 'إنشاء الحساب';

  @override
  String get accountLogOut => 'تسجيل الخروج';

  @override
  String get myBookingsTitle => 'طلباتي';

  @override
  String get myBookingsSignInPrompt => 'سجّل دخولك عشان تشوف سجل حجوزاتك.';

  @override
  String get myBookingsEmpty => 'مفيش أي حجوزات لسه.';

  @override
  String get bookingStatusPendingPayment => 'بانتظار الدفع';

  @override
  String get bookingStatusAwaitingVerification => 'بانتظار التحقق';

  @override
  String get bookingStatusConfirmed => 'مؤكد';

  @override
  String get bookingStatusCompleted => 'مكتمل';

  @override
  String get bookingStatusCancelled => 'ملغي';
}
