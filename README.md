# Yet Another Power Card (YAPC)
For Home Assistant.

https://github.com/mp3guy/yet-another-power-card/assets/3238631/a4678dda-7f67-4633-9a88-a0d5b6599028

This is yet another power flow card for home assistant. It is a heavily modified hard fork of @reptilex's [tesla-style-solar-power-card](https://github.com/reptilex/tesla-style-solar-power-card). My home power setup is quite extensive and I couldn't find a solution for visualization that met my needs, so I created this card. Note the video above uses some placeholder values for illustration purposes only; the video below is a real setup capture.

## Features
Following the style of the source project, it supports:

- A grid entity.
- Two separate solar array entities, each connected to their own inverter.
- A battery entity connected to one of the inverters.
- Up to three additional building entities connected to the main building.
- Up to three electric vehicle (EV) charger entities.
- Up to five generic appliance entities.
- Full icon, main value and extra value specification per node.
- Auto-hiding of unspecified entities.

## Limitations
The card has a few limitations, mostly inherited from the source:
- The topology and connectivity is fixed. Sorry, I didn't have the time to create a general purpose graph card or optimal node layout routine.
- Resizing is a bit choppy depending on your browser. It's _ok_ in Firefox, Chrome and the Home Assistant Android app but sometimes a refresh/resize is required.
- Support and documentation will be very limited.

## Installation
Copy `power-card.js` into the `www` folder in your home assistant configuration directory root. You can then manually add it by going from your default view three dots in the top right > edit dashboard > three dots in the top right > manage resources. Click add resource, type JavaScript module, URL `/local/power-card.js`, create.

Then, add a custom YAML card on your dashboard like so:

```yaml
type: custom:power-card
appliance0_icon: mdi:water-boiler
appliance1_icon: mdi:heat-pump
appliance2_icon: mdi:shower-head
appliance3_icon: mdi:kettle-steam
appliance4_icon: mdi:water-pump
ev0_icon: mdi:car-sports
ev1_icon: mdi:car-hatchback
ev2_icon: mdi:car-estate
building0_icon: mdi:garage-variant
building2_icon: mdi:water-well
building3_icon: mdi:horse-variant
pv0_entity: sensor.solax_pv_total_power
pv0_extra_entity: sensor.south_yield
pv1_entity: sensor.solaredge_dc_power
pv1_extra_entity: sensor.solaredge_energy_today
battery_entity: sensor.solax_battery_power_charge
battery_extra_entity: sensor.solax_battery_capacity_charge
inverter0_entity: sensor.solax_inverter_load
inverter0_extra_entity: South
inverter1_entity: sensor.solaredge_ac_power
inverter1_extra_entity: E/W
grid_entity: sensor.solax_grid_power
grid_extra_entity: sensor.solaredge_imported_energy_template
building1_entity: sensor.building1_sum
building1_extra_entity: sensor.house_daily_energy_usage
building2_entity: sensor.shelly_em_water_shed_channel_1_power
building2_extra_entity: sensor.watershed_daily_energy_usage
building3_entity: sensor.shelly_em_stables_channel_1_power
building3_extra_entity: sensor.stables_daily_energy_usage
ev1_extra_entity: sensor.zappi_plug
appliance0_extra_entity: sensor.myenergi_eddi_energy_used_today
appliance3_extra_entity: sensor.steamer_daily_energy_usage
appliance4_extra_entity: sensor.daily_water_usage_litres
hide_inactive_entities: true
pv0_to_battery_entity: sensor.pv0_to_battery
pv0_to_inverter0_entity: sensor.pv0_to_inverter0
pv1_to_inverter1_entity: sensor.solaredge_dc_power
battery_to_inverter0_entity: sensor.battery_to_inverter0
inverter0_to_battery_entity: sensor.inverter0_to_battery
inverter1_to_inverter0_entity: sensor.inverter1_to_inverter0
inverter0_to_building1_entity: sensor.inverter0_to_building1
inverter0_to_grid_entity: sensor.inverter0_to_grid
grid_to_inverter0_entity: sensor.grid_to_inverter0
grid_to_building1_entity: sensor.grid_to_building1
inverter1_to_grid_entity: sensor.inverter1_to_grid
inverter1_to_building1_entity: sensor.inverter1_to_building1
building1_to_ev1_entity: sensor.myenergi_zappi_internal_load_ct1
building1_to_building2_entity: sensor.shelly_em_water_shed_channel_1_power
building1_to_building3_entity: sensor.shelly_em_stables_channel_1_power
building1_to_appliance0_entity: sensor.myenergi_eddi_internal_load_ct1
building2_to_appliance4_entity: sensor.shelly_em_water_shed_channel_2_power
building3_to_appliance3_entity: sensor.shelly_em_stables_channel_2_power
```
With entities customized to your own specific values. This configuration looks like so:

https://github.com/mp3guy/yet-another-power-card/assets/3238631/4c576c3c-73ae-4a20-85ef-6f4f2e8a5db5

## How to calculate entities
Like its predecessor, everything is specified in terms of `_to_` entities that are always positive. These can be tricky to work out, so here's a guide:

```python
# We have:
# inverter0_ct (positive for outputting power, negative for drawing power)
# inverter1_ct (positive for outputting power)
# grid_ct (positive for outputting power from grid, negative for drawing power to grid)
# battery_ct (positive for power going to battery, negative for power being drawn from battery)
# pv0_ct (positive for outputting power)

# We need:
# The total usage is the sum of the three generators
building1_sum = inverter0_ct + inverter1_ct + grid_ct
# This is the total of positive power only
building1_pos = max(0, inverter0_ct) + max(0, inverter1_ct) + max(0, grid_ct)
# Each entity's contribution to the house is proportional to its positive power contribution
inverter0_to_building1 = (max(0, inverter0_ct) / building1_pos) * building1_sum
inverter1_to_building1 = (max(0, inverter1_ct) / building1_pos) * building1_sum
grid_to_building1 = (max(0, grid_ct) / building1_pos) * building1_sum

# It is useful to work out the apportionment of the battery's power
# The inverter only goes negative when putting power into the battery
inverter0_to_battery = -min(0, inverter0_ct)
# We can directly take the negative value for the opposite direction
battery_to_inverter0 = max(0, -battery_ct)
# Any power going to the battery not accounted for by the inverter must be pv
pv0_to_battery = max(0, max(0, battery_ct) - inverter0_to_battery)
# Power from pv to inverter is the remainder not going to the battery
pv0_to_inverter0 = pv0_ct - pv0_to_battery

# The power going to the inverter from grid is any remaining not going to the building
grid_to_inverter0 = max(0, max(0, grid_ct) - grid_to_building1)
# Because inverter0_ct is negative when going to battery, any remainder is grid bound
inverter0_to_grid = max(0, max(0, inverter0_ct) - inverter0_to_building1)
# Anything going to the grid not from inverter0 is inverter1
inverter1_to_grid = max(0, -min(0, grid_ct) - inverter0_to_grid))
# Anything leaving inverter1 not going to the grid or building is going to inverter0
inverter1_to_inverter0 = max(0, inverter1_ct - (inverter1_to_grid + inverter1_to_building1))
```
This may be somewhat specific to my setup where I have a hybrid inverter with DC coupled battery that is capable of harvesting power from my other regular string inverter.

In reality however, measurements are noisy and not time synchronized. Hitches happen so the actual template values themselves need some massaging. You'll likely get a couple of these directly from your solar inverter integrations, but the others will have to be coded up as templates. Here are mine for completeness, including my whole house backup feed (EPS) and some `max` operators to prevent bad values.

```yaml
building1_sum:
    value_template: >-
      {{
          [states("sensor.solax_inverter_load") | int(0) +
           states("sensor.solax_eps_power") | int(0) +
           states("sensor.solaredge_ac_power") | int(0) +
           (0 - (states("sensor.solax_feedin_power") | int(0))), 0] | max
      }}
    device_class: power
    unit_of_measurement: W
building1_pos:
    value_template: >-
      {{
          [states("sensor.solax_inverter_load") | int(0), 0] | max +
          [states("sensor.solax_eps_power") | int(0), 0] | max +
          [states("sensor.solaredge_ac_power") | int(0), 0] | max +
          [(0 - (states("sensor.solax_feedin_power") | int(0))), 0] | max
      }}
    device_class: power
    unit_of_measurement: W
inverter0_to_building1:
    value_template: >-
      {{
          [(((states("sensor.solax_eps_power") | float(0) + [states("sensor.solax_inverter_load") | float(0), 0] | max) /
              states("sensor.building1_pos") | float(0)) *
              states("sensor.building1_sum") | float(0)) | round(default=0) | int(0), 0] | max
      }}
    device_class: power
    unit_of_measurement: W
inverter1_to_building1:
    value_template: >-
      {{
          [((([states("sensor.solaredge_ac_power") | float(0), 0] | max) /
              states("sensor.building1_pos") | float(0)) *
              states("sensor.building1_sum") | float(0)) | round(default=0) | int(0), 0] | max
      }}
    device_class: power
    unit_of_measurement: W
grid_to_building1:
    value_template: >-
      {{
          [((([(0 - (states("sensor.solax_feedin_power") | float(0))), 0] | max) /
              states("sensor.building1_pos") | float(0)) *
              states("sensor.building1_sum") | float(0)) | round(default=0) | int(0), 0] | max
      }}
    device_class: power
    unit_of_measurement: W
inverter0_to_battery:
    value_template: >-
      {{
          -([states("sensor.solax_inverter_load") | int(0), 0] | min)
      }}
    device_class: power
    unit_of_measurement: W
battery_to_inverter0:
    value_template: >-
      {{
          [-(states("sensor.solax_battery_power_charge") | int(0)), 0] | max
      }}
    device_class: power
    unit_of_measurement: W
pv0_to_battery:
    value_template: >-
      {{
            [([states("sensor.solax_battery_power_charge") | int(0), 0] | max) -
                states("sensor.inverter0_to_battery") | int(0), 0] | max
      }}
    device_class: power
    unit_of_measurement: W
pv0_to_inverter0:
    value_template: >-
      {% if (states("sensor.solax_inverter_load") | int(0)) < 0 %}
          0
      {% else %}
        {{ [([(states("sensor.solax_pv_total_power") | int(0)) - (states("sensor.pv0_to_battery") | int(0)), 0] | max), states("sensor.solax_inverter_load") | int(0) + states("sensor.solax_eps_power") | int(0)] | min }}
      {% endif %}
    device_class: power
    unit_of_measurement: W
grid_to_inverter0:
    value_template: >-
      {{
          [([(0 - (states("sensor.solax_feedin_power") | int(0))), 0] | max) -
              states("sensor.grid_to_building1") | int(0), 0] | max
      }}
    device_class: power
    unit_of_measurement: W
inverter0_to_grid:
    value_template: >-
      {{
          [([states("sensor.solax_inverter_load") | int(0), 0] | max) -
              states("sensor.inverter0_to_building1") | int(0), 0] | max
      }}
    device_class: power
    unit_of_measurement: W
inverter1_to_grid:
    value_template: >-
      {{
          [states("sensor.solaredge_ac_power") | int(0), [-([(0 - (states("sensor.solax_feedin_power") | int(0))), 0] | min) -
              states("sensor.inverter0_to_grid") | int(0), 0] | max] | min
      }}
    device_class: power
    unit_of_measurement: W
inverter1_to_inverter0:
    value_template: >-
      {{
          [states("sensor.solaredge_ac_power") | int(0) -
            (states("sensor.inverter1_to_grid") | int(0) +
              states("sensor.inverter1_to_building1") | int(0)), 0] | max
      }}
    device_class: power
    unit_of_measurement: W
```
To avoid flickering there are some thresholds, in the low double digit Watts to disable entities near inflection points (e.g. grid export/import near zero). Additionally, spurious non-zero values are also filtered.

Here's the complete set of configuration options:
```typescript
//Line settings
hide_inactive_entities?: boolean;
speed_factor?: number;

// Icons
grid_icon?: string;
battery_icon?: string;
pv0_icon?: string;
pv1_icon?: string;
inverter0_icon?: string;
inverter1_icon?: string;
building0_icon?: string;
building1_icon?: string;
building2_icon?: string;
building3_icon?: string;
appliance0_icon?: string;
appliance1_icon?: string;
appliance2_icon?: string;
appliance3_icon?: string;
appliance4_icon?: string;
ev0_icon?: string;
ev1_icon?: string;
ev2_icon?: string;

// What click through to. The "leaf" node ev and appliances implicitly click through to their
// entity from their parent to themselves
grid_entity?: string;
battery_entity?: string;
pv0_entity?: string;
pv1_entity?: string;
inverter0_entity?: string;
inverter1_entity?: string;
building0_entity?: string;
building1_entity?: string;
building2_entity?: string;
building3_entity?: string;

// Power from one thing to another
pv0_to_battery_entity?: string;
pv0_to_inverter0_entity?: string;
pv1_to_inverter1_entity?: string;
battery_to_inverter0_entity?: string;
inverter0_to_battery_entity?: string;
inverter1_to_inverter0_entity?: string;
inverter0_to_building1_entity?: string;
inverter0_to_grid_entity?: string;
grid_to_inverter0_entity?: string;
grid_to_building1_entity?: string;
inverter1_to_grid_entity?: string;
inverter1_to_building1_entity?: string;
building1_to_ev1_entity?: string;
building1_to_building0_entity?: string;
building1_to_building2_entity?: string;
building1_to_building3_entity?: string;
building1_to_appliance2_entity?: string;
building1_to_appliance0_entity?: string;
building0_to_ev0_entity?: string;
building0_to_ev2_entity?: string;
building0_to_appliance1_entity?: string;
building2_to_appliance4_entity?: string;
building3_to_appliance3_entity?: string;

// Extra entities that are shown on the card
grid_extra_entity?: string;
pv0_extra_entity?: string;
pv1_extra_entity?: string;
inverter0_extra_entity?: string;
inverter1_extra_entity?: string;
building0_extra_entity?: string;
building1_extra_entity?: string;
building2_extra_entity?: string;
building3_extra_entity?: string;
battery_extra_entity?: string;
appliance0_extra_entity?: string;
appliance1_extra_entity?: string;
appliance2_extra_entity?: string;
appliance3_extra_entity?: string;
appliance4_extra_entity?: string;
ev0_extra_entity?: string;
ev1_extra_entity?: string;
ev2_extra_entity?: string;
```
Non-specified entities will not be drawn.

## Development
This is a typescript project, so to build it first install packages:
```bash
npm install
```
And then build
```bash
npm run build
```
I included a convenience script, `deploy.sh`, that also runs the linter.

## TODO / Accepting PRs on
There's a few nice-to-haves I didn't get a chance to implement I'm capturing here:
- Dynamic static grid layout selection based on provided entities.
  - The current fixed layout can leave some empty columns/rows if you don't have certain entities, which looks bad. It would be relatively straightforward to dynamically specify the CSS grid layout based on available entities to expand it and use up the full card.
- Generalization of graph topology and entities.
  - This is a bigger job, but it's partially complete. Basically allow arbitrary numbers of arbitrary entities with arbitrary connectivity and layout.
