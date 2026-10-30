# ElectroSim – Electrical Simulator

Browser-based electrical and industrial automation simulator (HTML, CSS, JavaScript – no build step).

## Run
Open `index.html` in a browser, or serve the folder (e.g. `python3 -m http.server`).
To host on GitHub Pages: Settings → Pages → Deploy from branch → `main` / root.

## Features
- Drag-and-drop component library (EPLAN-style): DC/AC supply, battery; MCB, MCCB, fuse, isolator, thermal overload relay; switch, push buttons NO/NC, emergency stop, relay, contactor, ON-delay timer; proximity & limit switches; lamp, pilot lamp, buzzer, heater, solenoid valve, motor, resistor, capacitor, diode, transformer, terminal, voltmeter, ammeter
- Click-to-wire terminals; move, rotate (R), delete (Del), edit parameters
- RUN / PAUSE / STOP / SAVE / LOAD / RESET
- Modified Nodal Analysis solver with relay/contactor logic, fuse blow, breaker trip, capacitor transient
- Fault detection: short circuit, overload, open circuit, unconnected terminals, overvoltage

## Extending
Add a new part to the `D` registry in `js/app.js` (terminals `t`, params `p`, circuit elements `el`, symbol `g`).
The solver is in `step()`; it is independent of the drawing code.

## Limitations
AC is solved as steady-state RMS; motors are resistive loads; no 3-phase, timers or PLC blocks yet.

## Library
Grouped dropdowns (IEC 60617 style symbols): voltage sources (DC/AC/battery), fuses (glass, gG, aM, aR, NH, time-delay), circuit breakers (MCB B/C/D, MCCB, MPCB), switches/push buttons/E-stop/selector/key/SPDT, relays/timer/contactors (2P, 3P), sensors (inductive, capacitive, photoelectric, limit, pressure, temperature, level, flow), lamps, motors (AC/DC), capacitors, resistors, potentiometer, inductor, diodes/LED, transformer, instruments.

Also: earth/PE reference, SMPS supply, fuse switch-disconnector, OFF-delay timer, RTD/NTC sensors, bridge rectifier, isolating transformer, plug connector, fan/pump motors. Device tags follow IEC 81346 as used by EPLAN (QF, FA, KM, KA, KT, HL, HA...).

## Wiring & export
Click a terminal to start a wire, click empty canvas to fix each bend, click another terminal to finish (Esc / right-click cancels, Backspace removes the last bend). EXPORT PDF saves the diagram plus a parts list (and simulation results while running) using jsPDF from cdnjs.
