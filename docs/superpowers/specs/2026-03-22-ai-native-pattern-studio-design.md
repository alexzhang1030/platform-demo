# AI-Native Pattern Studio Design

## Goal
Add an AI-native workflow to the editor demo that turns natural-language prompts into structured modeling commands, applies controlled edits to the current design, and surfaces manufacturing-oriented checks.

## Scope
- Add an AI Studio panel to the editor.
- Parse a small prompt vocabulary into structured commands.
- Execute `generate` and `patch` commands through deterministic helpers.
- Display intent, execution steps, and manufacturing checks.

## Architecture
1. **Intent parser** converts prompt text into a structured command envelope.
2. **Command executor** turns that command into a new `PatternDocument` or an updated one.
3. **Manufacturing checker** produces pass/warning/fail issues from the generated result.
4. **Editor UI** exposes prompt input, history, command details, and check results while keeping the editor as the rendering client.

## Supported commands
### Generate
- Structure types: `box`, `tray`
- Parameters: width, height, depth, thickness
- Joinery: `finger-joint`, `slot`, `none`
- Feature: handle cutout on/off

### Patch
- Resize width/height/depth
- Adjust thickness
- Toggle handle cutout
- Change joint type

## Data model
Use a small command envelope with:
- original prompt
- mode (`generate` | `patch`)
- summary
- confidence
- parse status (`ready` | `partial` | `failed`)
- execution command payload

## UX
The AI panel shows:
- prompt input and quick suggestions
- parsed intent summary
- command payload
- execution steps
- manufacturing checks
- history of recent runs

## Error handling
- Partial parse should explain what is missing.
- Failed parse should keep the current document unchanged.
- Checks should still run for successful generations and patches.

## Testing
- Parser tests for generate / patch / partial / failed cases.
- Executor tests for generated document shape and patch behavior.
- Checker tests for warnings and pass cases.

## Notes
This is a deterministic, contract-first implementation that can later swap the parser with a real LLM while preserving the command schema, executor, and checks.
