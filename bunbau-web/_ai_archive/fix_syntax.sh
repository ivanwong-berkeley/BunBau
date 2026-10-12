#!/bin/bash
sed -i '' -e 's/                    <\/div>/                  )}/g' src/app/page.tsx
sed -i '' -e 's/               )}/                <\/div>/g' src/app/page.tsx
