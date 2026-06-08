# Super-Prompt — Base (Product Showcase) v2.0

Generate a complete build prompt for the base archetype:

```bash
node ~/.hermes/skills/creative/3d-website-builder/generate-superprompt.js \
  --template=base \
  --project=my-showcase \
  --reference=https://webxr-sneakers.lusion.co \
  --model=/public/my-model.gltf \
  --sections=Hero,About,Features,CTA \
  --colors=primary:#7c3aed,accent:#ec4899,bg:#0a0a0a \
  --hdri=studio \
  --output-builder=./builder.md \
  --output-reviewer=./reviewer.md
```

Or use the multi-agent pipeline: load `3d-website-multi-agent` skill.

---

## Archetype Reference

See: `~/.hermes/skills/creative/3d-website-builder/references/archetype-base.md`

- **Design DNA:** Scroll-driven camera orbits + glTF model + glassmorphism UI
- **Lighting:** 3-point (key+fill+rim), hemisphere, studio preset
- **Camera:** Balanced spring (120-220 tension, 14-28 damping) + 3DOF + velocity
- **Components:** Nav, AnimatedHeading, PrimaryButton (baked in ui.jsx)
- **Reference sites:** webxr-sneakers.lusion.co, robinpayot.com, exp-gemini.lusion.co
