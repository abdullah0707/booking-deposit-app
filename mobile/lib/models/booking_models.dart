enum ServiceLocationType { onSite, customerAddress, either }

ServiceLocationType _parseLocationType(String? value) {
  switch (value) {
    case "CUSTOMER_ADDRESS":
      return ServiceLocationType.customerAddress;
    case "EITHER":
      return ServiceLocationType.either;
    default:
      return ServiceLocationType.onSite;
  }
}

class Service {
  final String id;
  final String name;
  final int durationMinutes;
  final String price;
  final String depositAmount;
  final String? imageUrl;
  final ServiceLocationType locationType;

  Service({
    required this.id,
    required this.name,
    required this.durationMinutes,
    required this.price,
    required this.depositAmount,
    this.imageUrl,
    this.locationType = ServiceLocationType.onSite,
  });

  factory Service.fromJson(Map<String, dynamic> json) => Service(
        id: json["id"] as String,
        name: json["name"] as String,
        durationMinutes: json["durationMinutes"] as int,
        price: json["price"].toString(),
        depositAmount: json["depositAmount"].toString(),
        imageUrl: json["imageUrl"] as String?,
        locationType: _parseLocationType(json["locationType"] as String?),
      );
}

class Slot {
  final DateTime startsAt;
  final DateTime endsAt;

  Slot({required this.startsAt, required this.endsAt});

  factory Slot.fromJson(Map<String, dynamic> json) => Slot(
        startsAt: DateTime.parse(json["startsAt"] as String),
        endsAt: DateTime.parse(json["endsAt"] as String),
      );
}

class PaymentMethod {
  final String id;
  final String type; // "STRIPE" | "PAYMOB" | "MANUAL"
  final String label;
  final Map<String, dynamic> config;

  PaymentMethod({required this.id, required this.type, required this.label, required this.config});

  factory PaymentMethod.fromJson(Map<String, dynamic> json) => PaymentMethod(
        id: json["id"] as String,
        type: json["type"] as String,
        label: json["label"] as String,
        config: (json["config"] as Map<String, dynamic>?) ?? {},
      );
}
