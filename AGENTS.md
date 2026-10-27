# 10Potatoes visual scope

All future cosmetic changes apply only to potato levels. Animal and flower levels must retain their existing appearance. Guard rendering changes with the game's `isSilhouetteMode(mode)` exclusion, and scope CSS so both `.level-animals` and `.level-flowers` are excluded. Verify both non-potato modes when changing shared rendering code.

This rule starts with the flour-target change. Do not retroactively revert previously approved shared sizing or backgrounds as part of an unrelated cosmetic task.
