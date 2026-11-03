# Animated catalog evaluation

The starter catalog contains 79 ExerciseDB / AscendAPI exercise records retrieved from the documented public V1 API on 2026-11-02. Only metadata and original 180p GIF URLs are included; media files are delivered by the provider. Provider attribution is shown in the exercise picker and demonstration.

This is a non-commercial evaluation integration. The free source restricts commercial/monetised use; obtain a suitable paid subscription or a separately licensed library before commercial launch. This integration does not purchase or imply a commercial media licence.

The initial metadata snapshot avoids provider rate limits during app use. `parseAnimatedCatalog` is the adapter for future API responses. Existing Free Exercise DB references remain readable and are never automatically matched or rewritten. New references use the `exercisedb` provider and `edb_` ID namespace.

GIF hosts and exercise IDs are checked on both client and server. The server accepts old and new catalog references in prescriptions, models, approved alternatives and immutable execution snapshots.

Sources: https://oss.exercisedb.dev/docs and https://docs.ascendapi.com/products/edb-v1/overview
