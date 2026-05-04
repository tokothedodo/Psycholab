import re
import sys

# Define keys to keep patterns
patterns = [
    r'^app\.', r'^nav\.', r'^home\.', r'^login\.', r'^signup\.', r'^dashboard\.', r'^roomBuilder\.', r'^catalog\.', r'^cat\.',
    r'^exp\.(mullerLyer|stroop|digitSpan|ultimatum)\.',
    r'^experiment\.(mullerLyer|stroop|digitSpan|ultimatum)\.',
    r'^config\.(trials|isi|stimulusDuration|responseTimeLimit|showFeedback|showProgressBar|customInstructions|randomizeOrder|practiceTrials|outlierRemoval|outlierThreshold|stroop|mullerLyer|digitSpan|ultimatum)\.',
    r'^common\.', r'^participant\.', r'^ai\.assistant\.', r'^color\.', r'^citation',
]

regex = re.compile('|'.join(patterns))

with open('/home/tornikekarchava/Documents/Code/Psycholab/src/i18n/translations.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Match lines like '    "key": "value",' or '    'key': 'value',"
    match = re.search(r"['\"]([^'\"]+)['\"\]\\s*:\s*", line)
    if match:
        key = match.group(1)
        if regex.search(key):
            new_lines.append(line)
    else:
        # Keep lines that don't look like key-value pairs (like structure/imports)
        new_lines.append(line)

with open('/tmp/cleaned_translations.ts', 'w') as f:
    f.writelines(new_lines)
