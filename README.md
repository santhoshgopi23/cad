# ElectroSim – Electrical Simulator

Browser-based electrical and industrial automation simulator (HTML, CSS, JavaScript – no build step).

## Run
Open `index.html`, or serve the folder (`python3 -m http.server`). GitHub Pages: Settings → Pages → `main` / root.

## What's new
- **Drag parts from the library** – press and drag a part (mouse, pen or finger); a ghost follows the pointer and a snapped preview shows exactly where it will land. Tap a part to drop it in the middle of the view instead. Placed parts can be dragged freely; arrow keys nudge the selection.
- **Draw your own title block** – no fixed title block any more. The tool strip on the sheet has **Select · Line · Box · Text · Logo**. Draw lines and boxes, type text (auto-fill tokens `{page} {pages} {title} {project} {dwgno} {rev} {date}`), add a logo and drag its corners to resize. Tick *Show on every page* to repeat it on all sheets and in the PDF. Hold Alt for free (un-snapped) placement; Shift or a near-straight drag keeps lines straight.
- **Wire colours** – after you connect two terminals the new wire is selected and the right panel asks for its colour (24 swatches incl. light colours, a custom picker, thickness, solid / dashed / dotted). With nothing selected the same controls set the colour of *new* wires. Wires can also be drawn by dragging from one terminal to another.
- **Hideable bottom bars** – the results table and the sheet tabs each have a ▾ button; a ▴ button on the sheet (and the ⋯ menu) brings them back.
- **3-phase supply redone** – L1 L2 L3 now sit in the same columns as 3-pole breakers, contactors and motors (wires drop straight down), N and PE to the right. Supply power is computed with complex power so line-to-line and mixed loads add up correctly. The 3-phase motor now honours Star / Delta.
- Multiple pages, PDF export (sheets + parts list), hideable library / properties panels and the touch UI are unchanged.

## Simulation notes
- AC is solved as steady-state RMS phasors; 3-phase sources are 0°/−120°/+120°, so line-to-line loads and phase loss work.
- Contacts follow the coil with the same label (any page). “Net / Page Link” parts with the same name are one node.
- VFD, soft starter and PLC are symbol-only (drawn and listed in the parts list, not simulated).

## Extending
Add a part to `D` in `js/registry.js`. Terminal coordinates should be multiples of 20.
Files: `registry.js` (parts) · `solver.js` (MNA engine) · `draw.js` (sheet, wires, drawn shapes) · `export.js` (PDF) · `app.js` (UI). PDF uses bundled jsPDF (MIT) in `js/vendor`.
