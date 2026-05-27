'use client';

import * as React from 'react';
import type { Property, Agent } from '@/lib/types';
import { AgentCard, type AgentCardHandle } from './AgentCard';
import { MobileActionBar } from './MobileActionBar';

interface Props {
  property: Property;
  agent?: Agent;
}

/**
 * Property detail için: agent kartı (desktop sticky kolonda) + mobil bottom action bar.
 * İkisi de aynı modal'lara (mesaj + randevu) erişir.
 */
export function PropertyDetailActions({ property, agent }: Props) {
  const ref = React.useRef<AgentCardHandle>(null);

  return (
    <>
      {agent && (
        <AgentCard
          ref={ref}
          agent={agent}
          propertyId={property.id}
          propertyTitle={property.title}
        />
      )}
      {agent && (
        <MobileActionBar
          property={property}
          agent={agent}
          onOpenAppointment={() => ref.current?.openAppointment()}
          onOpenMessage={() => ref.current?.openMessage()}
        />
      )}
    </>
  );
}
