import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";

import "package:miqat_mobile/main.dart";

void main() {
  testWidgets("Home screen renders the booking CTA", (WidgetTester tester) async {
    await tester.pumpWidget(const MiqatApp());
    await tester.pumpAndSettle();

    expect(find.text("Book now"), findsOneWidget);
    expect(find.byType(FilledButton), findsOneWidget);
  });
}
