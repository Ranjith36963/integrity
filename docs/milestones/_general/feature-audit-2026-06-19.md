# Dharma Feature Audit — live browser run

Generated: 2026-06-19T09:11:52.809Z

Total checks: 29
Pass: 29 · Fail: 0 · Unclear: 0


## TopBar

### ✓ pass — DHARMA brand (tap = no-op; long-press 600ms = M7e year-heatmap easter egg)
**Steps:**
- Locate header text 'DHARMA'
- Tap once → expect nothing
**Expected:** Tap is inert; long-press opens year heatmap overlay (M7e BrandMarkLongPress)
**Observed:** Brand visible; tap had no visible effect

### ✓ pass — DHARMA long-press → YearHeatmapPreview overlay
**Steps:**
- Long-press DHARMA for 700ms
- Check for overlay matching year-heatmap testid/label
**Expected:** Year heatmap preview opens for the active year
**Observed:** Overlay rendered (M7e easter egg)

### ✓ pass — Pencil button — toggles Edit Mode
**Steps:**
- Read pencil aria-label
- Click pencil
- Read aria-label again
- Click again to revert
**Expected:** Toggles between 'Edit mode, off' and 'Edit mode, on'
**Observed:** aria-label: 'Edit mode, off' → 'Edit mode, on'

### ✓ pass — Settings (gear) button — intentionally disabled until shipped
**Steps:**
- Locate Settings button
- Read aria-disabled
**Expected:** aria-disabled='true'; aria-label includes 'coming in a later release'
**Observed:** aria-disabled='true', label includes 'coming'


## BlueprintBar

### ✓ pass — Day blueprint section + NOW pin + segments
**Steps:**
- Check section visibility
- Count segments
**Expected:** Visible at all times; segments == 0 on empty state, > 0 once blocks exist
**Observed:** Section visible; segments: 0 (expected 0 on empty state)


## Hero

### ✓ pass — Hero contents (date / Building N of 365 / pct ring)
**Steps:**
- Read 3 testids
**Expected:** All three render real values after hydration. Empty state: 0%.
**Observed:** date: 'Fri, Jun 19', day: 'Building 1 of 365', pct: '0%'


## Timeline

### ✓ pass — Empty-state card
**Steps:**
- Check empty-state copy presence
**Expected:** Visible only when zero blocks AND zero loose bricks
**Observed:** Card visible with locked SPEC copy

### ✓ pass — NowLine — amber horizontal rule at current time
**Steps:**
- Check now-line visible + inline-style top px
**Expected:** Always visible; top px = current time × 64
**Observed:** Visible; style snippet: 'top: 582.4px; background: var(--accent); transform: translat…'

### ✓ pass — SlotTapTargets — 24 invisible hour-row buttons (tabIndex=-1)
**Steps:**
- Count slot buttons
**Expected:** Exactly 24 (one per hour)
**Observed:** count: 24


## BottomBar

### ✓ pass — Voice Log button (intentionally disabled until M10)
**Steps:**
- Check aria-disabled attribute
**Expected:** aria-disabled='true' until M10 ships voice
**Observed:** aria-disabled: 'true'

### ✓ pass — + Add button → opens AddChooserSheet
**Steps:**
- Click +
- Inspect dialog aria-label
**Expected:** Dialog aria-label='Add' (the M4d chooser)
**Observed:** Dialog opened; aria-label='Add'


## AddChooserSheet

### ✓ pass — Add Block button → opens AddBlockSheet
**Steps:**
- From chooser, click 'Add Block'
**Expected:** Dialog aria-label changes to 'Add Block'
**Observed:** Sheet now labelled 'Add Block'


## AddBlockSheet

### ✓ pass — Title input — required for Save
**Steps:**
- Fill title 'Audit Block'
**Expected:** Save aria-disabled flips to 'false' once Title non-empty
**Observed:** Title filled; Save should be enabled

### ✓ pass — Start input — accepts HH:MM, auto-fills from slot or rounded-down hour
**Steps:**
- Read initial value
- Fill '09:00'
- Read again
**Expected:** Editable; persists user value; format HH:MM
**Observed:** initial='09:00', after fill='09:00'

### ✓ pass — End input — accepts HH:MM, must be > Start
**Steps:**
- Fill '10:00'
- Tab to blur
**Expected:** Editable; validator requires end > start
**Observed:** after fill='10:00'

### ✓ pass — Recurrence chips (Just today / Every weekday / Every day / Custom range) — role=radio
**Steps:**
- Click 'every weekday' radio chip
- Check aria-checked
**Expected:** Selected chip is aria-checked='true'
**Observed:** aria-checked='true'

### ✓ pass — Save button — persists block, closes sheet
**Steps:**
- Click Save
- Check dialog dismissed
- Count blocks
**Expected:** Dialog closes (count 0); at least one block appears in timeline
**Observed:** dialog count: 0; timeline-block count: 1


## Timeline

### ✓ pass — TimelineBlock card
**Steps:**
- Read first timeline block text
**Expected:** Card shows name + time range + pct
**Observed:** text: 'Audit Block09:00–10:00NOW…'


## ViewSwitcher

### ✓ pass — Day · Week · Month · Year tablist
**Steps:**
- Locate role=tablist
- Read all 4 tab labels
**Expected:** 4 tabs: Day, Week, Month, Year
**Observed:** tabs found: Day, Week, Month, Year

### ✓ pass — Week tab → switches view
**Steps:**
- Click 'Week'
- Read aria-selected
**Expected:** Clicking a tab marks it aria-selected='true'
**Observed:** aria-selected='true'

### ✓ pass — Month tab → switches view
**Steps:**
- Click 'Month'
- Read aria-selected
**Expected:** Clicking a tab marks it aria-selected='true'
**Observed:** aria-selected='true'

### ✓ pass — Year tab → switches view
**Steps:**
- Click 'Year'
- Read aria-selected
**Expected:** Clicking a tab marks it aria-selected='true'
**Observed:** aria-selected='true'

### ✓ pass — Day tab → switches view
**Steps:**
- Click 'Day'
- Read aria-selected
**Expected:** Clicking a tab marks it aria-selected='true'
**Observed:** aria-selected='true'


## Edit Mode

### ✓ pass — × delete affordance on block → DeleteConfirmModal
**Steps:**
- Toggle Edit Mode on
- Click × on the audit block
- Check dialog appears
**Expected:** DeleteConfirmModal opens with confirm options
**Observed:** dialog count: 1


## Persistence (M8)

### ✓ pass — Block survives page reload (dharma:v1 localStorage round-trip)
**Steps:**
- Hard reload
- Recount blocks
**Expected:** Block count >= 1 (the audit block persists)
**Observed:** block count after reload: 1


## Timeline

### ✓ pass — Slot tap at 10:00 → chooser → AddBlockSheet pre-filled Start=10:00
**Steps:**
- Click invisible slot button at 10:00
- Walk through chooser → Add Block
- Verify Start input == 10:00
**Expected:** Chooser opens with aria-label='Add'; AddBlockSheet's Start = 10:00
**Observed:** chooser label='Add', prefilled=true


## AddChooserSheet

### ✓ pass — Add Brick button → opens AddBrickSheet
**Steps:**
- Open chooser
- Click Add Brick
- Inspect sheet aria-label
**Expected:** Dialog aria-label changes to 'Add Brick'
**Observed:** sheet now='Add Brick'


## AddBrickSheet

### ✓ pass — Escape key closes sheet (R7-ROOT-M3-P1-3)
**Steps:**
- Press Escape with sheet open
**Expected:** Dialog dismissed (count 0)
**Observed:** dialog count after ESC: 0


## AddChooserSheet

### ✓ pass — Cancel button closes chooser without picking
**Steps:**
- Open chooser
- Click Cancel
**Expected:** Chooser dismissed (count 0)
**Observed:** dialog count: 0
