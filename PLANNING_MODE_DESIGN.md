# S2R Tool - Dual-Mode Architecture Design
# Version: 4.0 - Planning Mode Addition
# Date: 2025-01-10

## OVERVIEW

S2R Tool sẽ có 2 modes hoạt động chính:
1. **Building Mode** (existing) - Render single building
2. **Planning Mode** (NEW) - Render urban planning/site layout

---

## MODE COMPARISON

| Aspect | Building Mode | Planning Mode |
|--------|---------------|---------------|
| **Input** | Single building sketch | Site plan with multiple lots |
| **Focus** | Architectural details | Lot shapes, massing, layout |
| **Detail Level** | High (windows, materials) | Medium (overall form) |
| **Camera** | Match sketch, facades | Aerial (45° drone, bird's eye) |
| **Scale** | Single structure | Multiple buildings + context |
| **Key Constraint** | Exact floor count, proportions | Lot boundaries, relationships |

---

## PLANNING MODE WORKFLOW

### Step 1: Upload & Lot Identification
```
User uploads site plan sketch
   ↓
System offers 2 options:
   A. Auto-detect lots (AI segmentation)
   B. User provides labeled map (manual)
   ↓
Result: Numbered lot map (1, 2, 3...)
```

### Step 2: Lot Description
```
For each lot, user fills:
   - Lot type (high-rise, low-rise, green space, road)
   - Building count
   - Height range
   - Style/character
   - Special notes
```

### Step 3: Generation
```
System builds planning-specific prompt
   ↓
Gemini generates aerial render
   ↓
Output: Photorealistic site render
```

---

## TECHNICAL ARCHITECTURE

### Frontend Structure
```
frontend/
├── index.html
│   ├── Mode selector (Building | Planning)
│   ├── Building panel (existing)
│   └── Planning panel (NEW)
│       ├── Lot segmentation view
│       ├── Lot description forms
│       └── Planning controls
└── script.js
    ├── Mode switching logic
    ├── Building functions (existing)
    └── Planning functions (NEW)
        ├── lotSegmentation()
        ├── collectLotDescriptions()
        └── generatePlanningRender()
```

### Backend Structure
```
backend/
├── api/
│   ├── analyze.py (existing)
│   ├── render.py (existing)
│   └── planning.py (NEW)
│       ├── /planning/analyze-lots
│       ├── /planning/segment-lots (optional AI)
│       └── /planning/render
├── core/
│   └── prompt_builder.py
│       ├── build_render_prompt() (existing)
│       └── build_planning_prompt() (NEW)
```

---

## PLANNING PROMPT STRATEGY

### Key Differences from Building Prompts

**Building Prompt Focus:**
- Window placement precision
- Material textures
- Facade details
- Exact floor count

**Planning Prompt Focus:**
- Lot shape fidelity (boundaries, proportions)
- Building massing (volume, not detail)
- Layout relationships (spacing, orientation)
- Aerial photorealism (drone perspective)
- Context coherence (roads, green spaces)

### Planning Prompt Template

```
ROLE: Expert urban planning visualizer

INPUT:
- Site plan sketch with {lot_count} identified lots
- Lot descriptions: {lot_details}

CRITICAL REQUIREMENTS (Priority Order):

1. LOT BOUNDARIES & SHAPES (ABSOLUTE - 95% fidelity required)
   ✓ Preserve EXACT shape of each lot from sketch
   ✓ Maintain lot-to-lot proportions (±3% tolerance)
   ✓ Keep road/pathway alignments unchanged
   ✓ Respect lot numbering/identification

2. BUILDING MASSING (High Priority)
   ✓ Match height tiers (high-rise vs low-rise)
   ✓ Respect building count per lot
   ✓ Maintain density distributions
   ✗ Do NOT focus on architectural details
   ✗ Do NOT make all buildings unique

3. AERIAL PERSPECTIVE (Required)
   ✓ Camera: {camera_angle} (default: 45° drone view)
   ✓ Realistic aerial photography characteristics
   ✓ Depth of field: focus on main lots, blur edges
   ✓ Atmospheric haze for distant areas

4. MATERIALS & LIGHTING
   - Glass: high reflection for towers
   - Concrete: displacement for texture
   - Wood slats: variation in facades
   - Lighting: {time_of_day} (day: sunlight 45°, night: street lights)

5. CONTEXT & EFFICIENCY
   ✓ Green spaces: simple, don't over-detail
   ✓ Roads: clear, realistic surfaces
   ✓ Buffer zones: contextual, low detail
   ✗ Do NOT waste resources on peripheral areas

6. OUTPUT
   - Aspect ratio: {aspect_ratio}
   - Style: Photorealistic aerial photograph
   - No text/labels/watermarks
```

---

## DATA MODELS

### LotDescription Schema
```python
{
    "lot_id": 1,
    "lot_number": "1",
    "type": "high-rise",  # high-rise, low-rise, green, road, mixed
    "building_count": 3,
    "height_range": "20-30 floors",
    "style": "modern glass towers",
    "special_notes": "waterfront orientation",
    "color_marker": "#FF5733"  # From segmentation map
}
```

### PlanningRequest Schema
```python
{
    "mode": "planning",
    "site_plan_image_base64": "...",
    "lot_map_image_base64": "...",  # Numbered/colored lot map
    "lots": [LotDescription, ...],
    "camera_angle": "drone_45",
    "time_of_day": "day",
    "aspect_ratio": "16:9",
    "style_keywords": "modern, sustainable"
}
```

---

## LOT SEGMENTATION OPTIONS

### Option A: AI Auto-Segmentation (Future)
- Use Gemini vision to detect lot boundaries
- Color-code different lot types
- Generate numbered map automatically

### Option B: User-Provided Map (Phase 1 - Simpler)
- User creates labeled map in external tool (Photoshop, etc.)
- Colors OR numbers identify lots
- System parses and allows description

**Recommendation: Start with Option B**, add Option A later

---

## UI/UX FLOW

### Mode Selection
```
┌─────────────────────────────────────┐
│  🏠 S2R Tool - Sketch to Render    │
├─────────────────────────────────────┤
│                                     │
│  Select Rendering Mode:             │
│                                     │
│  ┌───────────┐  ┌───────────┐     │
│  │  🏢       │  │  🏙️       │     │
│  │ Building  │  │ Planning  │     │
│  │  Render   │  │  Render   │     │
│  └───────────┘  └───────────┘     │
│    [Active]       [New!]          │
└─────────────────────────────────────┘
```

### Planning Panel Layout
```
┌─────────────────────────────────────┐
│  📍 Planning Render                 │
├─────────────────────────────────────┤
│                                     │
│  Step 1: Upload Site Plan           │
│  [Upload Sketch]                    │
│                                     │
│  Step 2: Lot Identification         │
│  ○ AI Auto-Detect (Coming Soon)     │
│  ● Upload Numbered Map              │
│  [Upload Map with Lot Numbers]      │
│                                     │
│  Step 3: Describe Lots              │
│  ┌─────────────────────────────┐   │
│  │ Lot 1 - High-Rise Zone      │   │
│  │ ├─ Type: High-rise          │   │
│  │ ├─ Buildings: 3             │   │
│  │ ├─ Height: 25-30 floors     │   │
│  │ └─ Style: Glass towers      │   │
│  └─────────────────────────────┘   │
│  [+ Add Lot]                        │
│                                     │
│  Step 4: Camera & Settings          │
│  Camera: [Drone 45°]                │
│  Time: [Day ▼]                      │
│  Aspect: [16:9 ▼]                   │
│                                     │
│  [Generate Planning Render]         │
└─────────────────────────────────────┘
```

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (MVP)
- [x] Design architecture
- [ ] Add mode selector UI
- [ ] Create planning panel (manual lot input)
- [ ] Implement planning prompts
- [ ] Basic planning render endpoint

### Phase 2: AI Features
- [ ] Auto lot segmentation (Gemini vision)
- [ ] Intelligent lot type detection
- [ ] Style suggestions per lot

### Phase 3: Advanced
- [ ] Iterative lot editing
- [ ] Before/after comparison
- [ ] Export planning documentation

---

## TESTING CONSIDERATIONS

### Planning Mode Tests
1. **Lot Fidelity**:
   - Upload simple 3-lot plan
   - Verify output preserves lot shapes

2. **Scale Handling**:
   - Test with 10+ lots
   - Check performance

3. **Camera Angles**:
   - Test drone 45°, bird's eye, eye level
   - Verify perspective accuracy

4. **Detail Balance**:
   - Ensure buildings aren't over-detailed
   - Verify green spaces stay simple

---

## COST ESTIMATION

### Per Planning Render:
- Lot analysis (if AI): $0.0035 (Gemini Pro)
- Planning render: $0.04 (Gemini Flash Image)
- **Total: ~$0.044 per render**

Similar to building renders, efficient!

---

## MIGRATION NOTES

- Existing building mode: **NO CHANGES** (fully backward compatible)
- All current features preserved
- Planning mode is additive
- Users explicitly choose mode

---

## SUCCESS METRICS

### For Planning Mode:
- Lot shape accuracy: >90%
- Layout fidelity: >85%
- User satisfaction: >80%
- Render time: <120s per plan

---

END OF DESIGN DOCUMENT
