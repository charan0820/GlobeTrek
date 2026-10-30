import { createHash } from "node:crypto";

export const stableId = (key) =>
  createHash("sha256").update(`globetrek:v1:${key}`).digest("hex").slice(0, 24);
const definitions = [
  [
    "IN",
    "IND",
    "India",
    "INR",
    22,
    79,
    "Palaces, waterways, and living traditions.",
    "https://www.incredibleindia.gov.in/en",
    [
      [
        "Jaipur",
        "Asia/Kolkata",
        26.9124,
        75.7873,
        [
          ["Amber Fort", 26.9858, 75.8513],
          ["Hawa Mahal", 26.9239, 75.8267],
          ["City Palace Jaipur", 26.9258, 75.8237],
          ["Jantar Mantar Jaipur", 26.9248, 75.8246],
        ],
      ],
      [
        "Udaipur",
        "Asia/Kolkata",
        24.5854,
        73.7125,
        [
          ["City Palace Udaipur", 24.5764, 73.6835],
          ["Lake Pichola", 24.5716, 73.6788],
          ["Saheliyon ki Bari", 24.6013, 73.6851],
          ["Bagore ki Haveli", 24.5798, 73.6821],
        ],
      ],
      [
        "Kochi",
        "Asia/Kolkata",
        9.9312,
        76.2673,
        [
          ["Fort Kochi Beach", 9.9658, 76.237],
          ["Mattancherry Palace", 9.9584, 76.2593],
          ["Paradesi Synagogue", 9.9576, 76.2596],
          ["St Francis Church Kochi", 9.9663, 76.241],
        ],
      ],
    ],
  ],
  [
    "JP",
    "JPN",
    "Japan",
    "JPY",
    36,
    138,
    "Temple paths, neighborhood streets, and remarkable cities.",
    "https://www.japan.travel/en/destinations/",
    [
      [
        "Tokyo",
        "Asia/Tokyo",
        35.6762,
        139.6503,
        [
          ["Senso-ji", 35.7148, 139.7967],
          ["Meiji Jingu", 35.6764, 139.6993],
          ["Ueno Park", 35.7154, 139.773],
          ["Shinjuku Gyoen", 35.6852, 139.71],
        ],
      ],
      [
        "Kyoto",
        "Asia/Tokyo",
        35.0116,
        135.7681,
        [
          ["Fushimi Inari Taisha", 34.9671, 135.7727],
          ["Kiyomizu-dera", 34.9949, 135.785],
          ["Kinkaku-ji", 35.0394, 135.7292],
          ["Arashiyama Bamboo Grove", 35.017, 135.6713],
        ],
      ],
      [
        "Osaka",
        "Asia/Tokyo",
        34.6937,
        135.5023,
        [
          ["Osaka Castle", 34.6873, 135.5262],
          ["Dotonbori", 34.6687, 135.5013],
          ["Shitenno-ji", 34.6545, 135.5165],
          ["Kuromon Market", 34.6653, 135.5063],
        ],
      ],
    ],
  ],
  [
    "TH",
    "THA",
    "Thailand",
    "THB",
    15,
    101,
    "Riverfront temples, northern hills, and island days.",
    "https://www.tourismthailand.org/",
    [
      [
        "Bangkok",
        "Asia/Bangkok",
        13.7563,
        100.5018,
        [
          ["Grand Palace Bangkok", 13.75, 100.4913],
          ["Wat Arun", 13.7437, 100.4889],
          ["Wat Pho", 13.7465, 100.493],
          ["Lumphini Park", 13.73, 100.5417],
        ],
      ],
      [
        "Chiang Mai",
        "Asia/Bangkok",
        18.7883,
        98.9853,
        [
          ["Wat Phra Singh", 18.7885, 98.9814],
          ["Wat Chedi Luang", 18.787, 98.9865],
          ["Doi Suthep Temple", 18.8049, 98.9216],
          ["Tha Phae Gate", 18.7879, 98.9933],
        ],
      ],
      [
        "Phuket",
        "Asia/Bangkok",
        7.8804,
        98.3923,
        [
          ["Phuket Old Town", 7.884, 98.3885],
          ["Kata Beach", 7.82, 98.299],
          ["Wat Chalong", 7.8467, 98.3381],
          ["Promthep Cape", 7.7591, 98.3055],
        ],
      ],
    ],
  ],
  [
    "ID",
    "IDN",
    "Indonesia",
    "IDR",
    -2,
    118,
    "Island landscapes and layers of heritage.",
    "https://www.indonesia.travel/us/en",
    [
      [
        "Ubud",
        "Asia/Makassar",
        -8.5069,
        115.2625,
        [
          ["Ubud Palace", -8.5069, 115.2625],
          ["Sacred Monkey Forest", -8.5186, 115.2587],
          ["Tegallalang Rice Terraces", -8.4312, 115.2794],
          ["Campuhan Ridge Walk", -8.5018, 115.2529],
        ],
      ],
      [
        "Yogyakarta",
        "Asia/Jakarta",
        -7.7956,
        110.3695,
        [
          ["Kraton Yogyakarta", -7.8053, 110.3642],
          ["Taman Sari", -7.81, 110.3594],
          ["Prambanan", -7.752, 110.4915],
          ["Malioboro Street", -7.7929, 110.3658],
        ],
      ],
      [
        "Jakarta",
        "Asia/Jakarta",
        -6.2088,
        106.8456,
        [
          ["National Monument Jakarta", -6.1754, 106.8272],
          ["Kota Tua", -6.1352, 106.8133],
          ["Istiqlal Mosque", -6.1702, 106.8314],
          ["Taman Mini Indonesia Indah", -6.3024, 106.8952],
        ],
      ],
    ],
  ],
  [
    "FR",
    "FRA",
    "France",
    "EUR",
    46.6,
    2.2,
    "Art, river walks, and Mediterranean light.",
    "https://www.france.fr/en/",
    [
      [
        "Paris",
        "Europe/Paris",
        48.8566,
        2.3522,
        [
          ["Eiffel Tower", 48.8584, 2.2945],
          ["Louvre Museum", 48.8606, 2.3376],
          ["Luxembourg Gardens", 48.8462, 2.3372],
          ["Sacre-Coeur", 48.8867, 2.3431],
        ],
      ],
      [
        "Nice",
        "Europe/Paris",
        43.7102,
        7.262,
        [
          ["Promenade des Anglais", 43.6942, 7.265],
          ["Castle Hill Nice", 43.6943, 7.2804],
          ["Cours Saleya", 43.6957, 7.2755],
          ["Matisse Museum Nice", 43.7195, 7.276],
        ],
      ],
      [
        "Lyon",
        "Europe/Paris",
        45.764,
        4.8357,
        [
          ["Basilica of Fourviere", 45.7622, 4.8226],
          ["Vieux Lyon", 45.762, 4.827],
          ["Parc de la Tete d Or", 45.7785, 4.854],
          ["Place Bellecour", 45.7578, 4.832],
        ],
      ],
    ],
  ],
  [
    "IT",
    "ITA",
    "Italy",
    "EUR",
    42.5,
    12.5,
    "Ancient streets, Renaissance art, and lagoon walks.",
    "https://www.italia.it/en",
    [
      [
        "Rome",
        "Europe/Rome",
        41.9028,
        12.4964,
        [
          ["Colosseum", 41.8902, 12.4922],
          ["Roman Forum", 41.8925, 12.4853],
          ["Pantheon Rome", 41.8986, 12.4769],
          ["Trevi Fountain", 41.9009, 12.4833],
        ],
      ],
      [
        "Florence",
        "Europe/Rome",
        43.7696,
        11.2558,
        [
          ["Florence Cathedral", 43.7731, 11.256],
          ["Uffizi Gallery", 43.7687, 11.2556],
          ["Ponte Vecchio", 43.768, 11.2531],
          ["Piazzale Michelangelo", 43.7629, 11.265],
        ],
      ],
      [
        "Venice",
        "Europe/Rome",
        45.4408,
        12.3155,
        [
          ["St Marks Square", 45.4342, 12.3388],
          ["Rialto Bridge", 45.438, 12.3359],
          ["Doges Palace", 45.4337, 12.3404],
          ["Basilica Santa Maria della Salute", 45.4309, 12.3345],
        ],
      ],
    ],
  ],
  [
    "ES",
    "ESP",
    "Spain",
    "EUR",
    40,
    -4,
    "City squares, bold architecture, and Andalusian courtyards.",
    "https://www.spain.info/en/",
    [
      [
        "Barcelona",
        "Europe/Madrid",
        41.3874,
        2.1686,
        [
          ["Sagrada Familia", 41.4036, 2.1744],
          ["Park Guell", 41.4145, 2.1527],
          ["Casa Batllo", 41.3917, 2.1649],
          ["Gothic Quarter Barcelona", 41.3833, 2.176],
        ],
      ],
      [
        "Madrid",
        "Europe/Madrid",
        40.4168,
        -3.7038,
        [
          ["Prado Museum", 40.4138, -3.6921],
          ["Retiro Park", 40.4153, -3.6845],
          ["Royal Palace Madrid", 40.4179, -3.7143],
          ["Plaza Mayor Madrid", 40.4154, -3.7074],
        ],
      ],
      [
        "Seville",
        "Europe/Madrid",
        37.3891,
        -5.9845,
        [
          ["Plaza de Espana Seville", 37.3772, -5.9869],
          ["Royal Alcazar Seville", 37.383, -5.9902],
          ["Seville Cathedral", 37.3858, -5.9931],
          ["Maria Luisa Park", 37.3743, -5.988],
        ],
      ],
    ],
  ],
  [
    "GR",
    "GRC",
    "Greece",
    "EUR",
    39,
    22,
    "Classical landmarks and Aegean horizons.",
    "https://www.visitgreece.gr/en",
    [
      [
        "Athens",
        "Europe/Athens",
        37.9838,
        23.7275,
        [
          ["Acropolis Athens", 37.9715, 23.7267],
          ["Acropolis Museum", 37.9684, 23.7285],
          ["Ancient Agora Athens", 37.975, 23.7225],
          ["National Garden Athens", 37.973, 23.737],
        ],
      ],
      [
        "Thessaloniki",
        "Europe/Athens",
        40.6401,
        22.9444,
        [
          ["White Tower", 40.6264, 22.9484],
          ["Rotunda Thessaloniki", 40.6334, 22.9524],
          ["Aristotelous Square", 40.6324, 22.9408],
          ["Ano Poli", 40.6421, 22.952],
        ],
      ],
      [
        "Chania",
        "Europe/Athens",
        35.5138,
        24.018,
        [
          ["Old Venetian Harbour Chania", 35.5181, 24.018],
          ["Chania Lighthouse", 35.5194, 24.0161],
          ["Archaeological Museum Chania", 35.517, 24.039],
          ["Nea Chora Beach", 35.5134, 24.0037],
        ],
      ],
    ],
  ],
  [
    "TR",
    "TUR",
    "Turkey",
    "TRY",
    39,
    35,
    "Bosphorus crossings, ancient sites, and extraordinary valleys.",
    "https://goturkiye.com/",
    [
      [
        "Istanbul",
        "Europe/Istanbul",
        41.0082,
        28.9784,
        [
          ["Hagia Sophia", 41.0086, 28.9802],
          ["Blue Mosque", 41.0054, 28.9768],
          ["Topkapi Palace", 41.0115, 28.9833],
          ["Galata Tower", 41.0256, 28.9741],
        ],
      ],
      [
        "Goreme",
        "Europe/Istanbul",
        38.6431,
        34.8289,
        [
          ["Goreme Open Air Museum", 38.6401, 34.8453],
          ["Uchisar Castle", 38.63, 34.8052],
          ["Love Valley", 38.6694, 34.8182],
          ["Pigeon Valley", 38.6345, 34.8133],
        ],
      ],
      [
        "Antalya",
        "Europe/Istanbul",
        36.8969,
        30.7133,
        [
          ["Hadrians Gate", 36.885, 30.7088],
          ["Kaleici", 36.884, 30.7042],
          ["Antalya Museum", 36.8843, 30.6784],
          ["Lower Duden Waterfalls", 36.8504, 30.7828],
        ],
      ],
    ],
  ],
  [
    "US",
    "USA",
    "United States",
    "USD",
    39,
    -98,
    "Distinctive neighborhoods, Pacific views, and open city parks.",
    "https://www.visittheusa.com/",
    [
      [
        "New York",
        "America/New_York",
        40.7128,
        -74.006,
        [
          ["Central Park", 40.7829, -73.9654],
          ["Metropolitan Museum of Art", 40.7794, -73.9632],
          ["Brooklyn Bridge", 40.7061, -73.9969],
          ["Statue of Liberty", 40.6892, -74.0445],
        ],
      ],
      [
        "San Francisco",
        "America/Los_Angeles",
        37.7749,
        -122.4194,
        [
          ["Golden Gate Bridge", 37.8199, -122.4783],
          ["Golden Gate Park", 37.7694, -122.4862],
          ["Ferry Building", 37.7955, -122.3937],
          ["Palace of Fine Arts", 37.8024, -122.448],
        ],
      ],
      [
        "Honolulu",
        "Pacific/Honolulu",
        21.3099,
        -157.8581,
        [
          ["Waikiki Beach", 21.2767, -157.8283],
          ["Diamond Head", 21.262, -157.8059],
          ["Iolani Palace", 21.3066, -157.8589],
          ["Bishop Museum", 21.333, -157.87],
        ],
      ],
    ],
  ],
];
export const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const countries = definitions.map(
  ([code, iso3, name, currency, lat, lng, description, source]) => ({
    code,
    iso3,
    name,
    currency,
    lat,
    lng,
    description,
    source,
    version: 1,
  }),
);
export const cities = definitions.flatMap(
  ([country, , , , , , , source, rows]) =>
    rows.map(([name, timezone, lat, lng]) => ({
      id: `${country.toLowerCase()}-${slugify(name)}`,
      country,
      name,
      timezone,
      lat,
      lng,
      source,
    })),
);
export const attractions = definitions.flatMap(
  ([country, , , , , , , source, rows]) =>
    rows.flatMap(([city, , , , places]) =>
      places.map(([name, lat, lng], index) => ({
        id: `${country.toLowerCase()}-${slugify(name)}`,
        country,
        cityId: `${country.toLowerCase()}-${slugify(city)}`,
        city,
        name,
        lat,
        lng,
        source,
        durationMinutes: [120, 90, 90, 60][index],
        description: `Explore ${name} during your time in ${city}. Check the linked destination guide for current access information.`,
        coordinateAccuracy:
          "Approximate planning marker; not an entrance or navigation location.",
        entryFee: null,
        visitDurationBasis:
          "Editorial planning estimate, not an opening-hours guarantee.",
      })),
    ),
);
const prices = {
  INR: 450000,
  JPY: 14000,
  THB: 240000,
  IDR: 85000000,
  EUR: 12500,
  TRY: 420000,
  USD: 17500,
};
export const tourRecords = cities.flatMap((city) =>
  ["Heritage walk", "Neighborhood discovery"].map((label, i) => {
    const country = countries.find((c) => c.code === city.country);
    const slug = `${city.id}-${i ? "neighborhood" : "heritage"}`;
    return {
      _id: stableId(slug),
      slug,
      name: `${city.name} ${label.toLowerCase()}`,
      country: city.country,
      cityId: city.id,
      city: city.name,
      timezone: city.timezone,
      lat: city.lat,
      lng: city.lng,
      currency: country.currency,
      price: Math.round(prices[country.currency] * (i ? 0.32 : 0.25)),
      durationMinutes: 120,
      localStart: i ? "14:00" : "09:00",
      total: 16,
      demo: true,
      description: `A fictional small-group ${label.toLowerCase()} in ${city.name}. Demo guide, schedule, and pricing; no real operator or transport included.`,
      attractionIds: attractions
        .filter((a) => a.cityId === city.id)
        .slice(i * 2, i * 2 + 2)
        .map((a) => a.id),
    };
  }),
);
export const hotelRecords = cities
  .filter((city) => city.country !== "IN")
  .flatMap((city) =>
    ["House", "Terrace"].map((label, i) => {
      const country = countries.find((c) => c.code === city.country);
      const slug = `${city.id}-${label.toLowerCase()}`;
      return {
        _id: stableId(slug),
        slug,
        name: `${city.name} ${label}`,
        city: city.name,
        cityId: city.id,
        country: city.country,
        timezone: city.timezone,
        lat: city.lat + i * 0.003,
        lng: city.lng + i * 0.003,
        currency: country.currency,
        demo: true,
        description: `Fictional ${city.name} stay created for the GlobeTrek demo. Location is illustrative; there is no real property or supplier.`,
        amenities: ["Wi-Fi", "Air conditioning", "Reception"],
        roomTypes: [2, 4].map((capacity, r) => ({
          _id: stableId(`${slug}-room-${r}`),
          name: r ? "Family room" : "Double room",
          capacity,
          basePrice: Math.round(
            prices[country.currency] * (i ? 1.15 : 1) * (r ? 1.5 : 1),
          ),
          totalInventory: r ? 4 : 8,
          amenities: ["Private bathroom"],
        })),
      };
    }),
  );
export const templates = countries.flatMap((country) =>
  [0, 1].map((i) => {
    const selected = cities
      .filter((c) => c.country === country.code)
      .slice(i, i + 2);
    return {
      id: `${country.code.toLowerCase()}-discovery-${i + 1}`,
      country: country.code,
      name: `${selected.map((c) => c.name).join(" & ")} in four days`,
      version: 1,
      days: selected.flatMap((city) =>
        [0, 1].map((j) => ({
          cityId: city.id,
          attractionIds: attractions
            .filter((a) => a.cityId === city.id)
            .slice(j * 2, j * 2 + 2)
            .map((a) => a.id),
        })),
      ),
      description:
        "An editable starting point. Transport and attraction entry are not included; check intercity travel independently.",
    };
  }),
);
export const packageRecords = templates.map((template) => ({
  _id: stableId(`package-${template.id}`),
  slug: `package-${template.id}`,
  name: template.name.replace("in four days", "discovery package"),
  country: template.country,
  templateId: template.id,
  version: 1,
  days: template.days,
  durationDays: 4,
  demo: true,
  description:
    "Fixed demo itinerary with three hotel nights and two scheduled guided tours. Transport, attraction tickets, meals and real payments are excluded.",
}));
