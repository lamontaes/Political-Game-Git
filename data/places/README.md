# U.S. Census Bureau 2025 Gazetteer Places

Source of the real-place identity corpus.

## Provenance

- **Dataset**: U.S. Census Bureau 2025 Gazetteer Places national file
- **Vintage**: 2025
- **Retrieval URL**: https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip
- **Retrieval Date**: 2025-01-01
- **Raw ZIP SHA-256**: `49644173a453469d9bd77fb7a493b027f87567e209edaf2078aac7543ac2ee29`
- **Raw TXT SHA-256**: `15f4977a010cc42308f4d5ddc5e19f26ef63fc035f20745333a14b78aa08d3fa`

The zip file is excluded from git via `.gitignore` to prevent shipping a huge opaque runtime parser/source.
The `.txt` file is also ignored, we only commit the compiled `.json` artifact.
