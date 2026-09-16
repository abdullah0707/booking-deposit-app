"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ServiceCard } from "@/components/ServiceCard";

interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: string;
  imageUrl?: string | null;
}

export function ServiceListSection({ content }: { content: { title?: string } }) {
  const [services, setServices] = useState<Service[] | null>(null);

  useEffect(() => {
    api.get<Service[]>("/services").then(setServices);
  }, []);

  if (!services || services.length === 0) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {content.title && <h2 className="mb-4 text-xl font-semibold">{content.title}</h2>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            name={service.name}
            imageUrl={service.imageUrl}
            subtitle={service.description}
            priceLabel={service.price}
          />
        ))}
      </div>
    </div>
  );
}
