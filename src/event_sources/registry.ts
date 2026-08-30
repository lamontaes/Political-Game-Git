import {
  NOAA_TROPICAL_HURRICANE_SOURCE,
  NOAA_TORNADO_SEVERE_WEATHER_SOURCE,
  NOAA_FLOODING_SOURCE,
  NOAA_WINTER_STORM_SOURCE,
  NOAA_EXTREME_HEAT_COLD_SOURCE,
  NOAA_DROUGHT_SOURCE,
} from "./adapters/noaa";
import { FEMA_DISASTER_DECLARATIONS_SOURCE } from "./adapters/fema";
import { DOE_417_POWER_DISTURBANCE_SOURCE } from "./adapters/doe";
import { USGS_EARTHQUAKE_SOURCE } from "./adapters/usgs";
import {
  NIFC_WILDFIRE_SOURCE,
  CDC_PUBLIC_HEALTH_SOURCE,
} from "./adapters/nifc_cdc";
import type {
  AuthoritativeProviderId,
  EventSourceDefinition,
  ExternalEventFamily,
} from "./types";

export class EventSourceRegistry {
  private readonly sources = new Map<string, EventSourceDefinition>();

  constructor(initialSources?: readonly EventSourceDefinition[]) {
    const defaults = [
      NOAA_TROPICAL_HURRICANE_SOURCE,
      NOAA_TORNADO_SEVERE_WEATHER_SOURCE,
      NOAA_FLOODING_SOURCE,
      NOAA_WINTER_STORM_SOURCE,
      NOAA_EXTREME_HEAT_COLD_SOURCE,
      NOAA_DROUGHT_SOURCE,
      FEMA_DISASTER_DECLARATIONS_SOURCE,
      DOE_417_POWER_DISTURBANCE_SOURCE,
      USGS_EARTHQUAKE_SOURCE,
      NIFC_WILDFIRE_SOURCE,
      CDC_PUBLIC_HEALTH_SOURCE,
    ];

    const toRegister = initialSources ?? defaults;

    for (const source of toRegister) {
      this.registerSource(source);
    }
  }

  public registerSource(source: EventSourceDefinition): void {
    if (this.sources.has(source.id)) {
      throw new Error(
        `Event source definition ID already registered: ${source.id}`,
      );
    }
    this.sources.set(source.id, source);
  }

  public getSource(id: string): EventSourceDefinition | undefined {
    return this.sources.get(id);
  }

  public requireSource(id: string): EventSourceDefinition {
    const source = this.sources.get(id);
    if (!source) {
      throw new Error(`Event source definition not found: ${id}`);
    }
    return source;
  }

  public getAllSources(): readonly EventSourceDefinition[] {
    return Array.from(this.sources.values());
  }

  public getSourcesByFamily(
    family: ExternalEventFamily,
  ): readonly EventSourceDefinition[] {
    return this.getAllSources().filter((source) => source.family === family);
  }

  public getSourcesByProvider(
    provider: AuthoritativeProviderId,
  ): readonly EventSourceDefinition[] {
    return this.getAllSources().filter(
      (source) => source.provider === provider,
    );
  }
}

export const DEFAULT_EVENT_SOURCE_REGISTRY = new EventSourceRegistry();
