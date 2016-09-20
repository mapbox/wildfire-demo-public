# wildfire-demo

A demo map of US wildfires.

## A few words about how it works

### Gathering and prepping the data

All the code involved in gathering and prepping data are in `lib/` and executed by an AWS Lambda function. The Lambda update function invokes `lib/update.js` — almost all the other files support that one.

Here are the data sources we end up with:

- A dataset of wildfire points, each point containing information from the Inciweb RSS feed.
- A tileset rendered from the wildfire points dataset.
- A dataset of wildfire maximum perimeters, with perimeter data from GeoMAC.
- A tileset rendered from the wildfire maximum perimeters dataset.
- A perimeter dataset for each wildfire that has prior perimeter data, fetched from GeoMAC.

The script first deletes stale data. It does this by checking for wildfire points that have not been updated for a while, then deleting those points and their corresponding maximum perimeters and perimeter datasets.

Then the script updates each data source: points, maximum perimeters, and perimeter datasets.

**Perimeter data in points:** Points are supplemented with the acreage and bounding boxes from their corresponding maximum perimeter. This enables the client-side app to display the acreage and zoom to the perimeter without having to query the tileset for a perimeter that corresponds to the clicked point.

**Perimeter transformations:** Perimeters are always converted from ArcGIS JSON (provided by GeoMAC) and slightly simplified (via Turf) to avoid unnecessarily huge geometries.

**Keeping the points tileset lean:** Points and maximum perimeters are kept in separate tilesets so that the points tileset can stay as lean as possible. By staying lean, the points tileset avoids undesireable minimum zoom levels that could be imposed during rendering.

**Filtering the perimeter datasets:** If we just used all the perimeters that GeoMAC provides for a fire, we could end up with too many perimeters. That could hurt the app's UX (e.g. if the Timeline has a huge number of nearly identical perimeters, or too many perimeters period) and could cause the Datasets API to refuse to send responses that are too large. To avoid these issues, we do a few things:

- Simplify the geometries, as mentioned above.
- Filter the list of perimeters so that it always includes the first and last perimeters, but each perimeter in between is only included in the list if it represents a notable change in size — i.e. an increase or decrease greather than a specified threshold.
- If there are more than 15 perimeters in the list, we increase that threshold and re-process the list — meaning that fewer perimeters will be different enough to make the cut, and the list will be more manageable. If we still have more than 15 perimeters, we increase again and repeat the process until the list has fewer than 15 perimeters.

Because of this filtering process, every time a perimeter dataset is updated it may differ from its previous version in unpredictable ways. So each perimeter dataset is deleted and re-created on each update.

**Handling fetching issues:** The GeoMAC and Inciweb servers occasionally time out or otherwise fail to respond. The Datasets API is very consistent but should also be allowed the occasional hiccup. So both APIs are invoked with functions that throttle the request count (via d3-queue) and automatically retry on certain errors.

### Proxy API

A couple of scripts in `lib/` are used by AWS API Gateway to provide a proxy API for the app. This proxy API allows us to do some things with the Datasets API that wouldn't otherwise be possible without exposing a secret Mapbox token; and to access the Inciweb RSS feeds client-side, which would otherwise fail because of CORS.
