import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed demo BMW 2002 auctions for development/testing
export const seedAuctions = mutation({
  handler: async (ctx) => {
    // Check if we already have auctions
    const existing = await ctx.db.query("auctions").first();
    if (existing) {
      return { seeded: false, message: "Auctions already exist" };
    }

    const now = Date.now();
    const hour = 60 * 60 * 1000;

    const auctions = [
      {
        batId: "bat-201001",
        batUrl: "https://bringatrailer.com/listing/1973-bmw-2002-tii-45",
        title: "1973 BMW 2002tii",
        year: 1973,
        make: "BMW",
        model: "2002",
        subtitle: "Inka Orange / Kugelfischer Injection / 5-Speed / Restored",
        location: "San Diego, CA",
        sellerUsername: "tii_enthusiast",
        description: "Fully restored 1973 BMW 2002tii in Inka Orange over black interior. Numbers-matching M10 engine with original Kugelfischer mechanical fuel injection. Professional restoration completed in 2023 including full respray, rebuilt engine, 5-speed Getrag conversion, Bilstein suspension, and Recaro seats. Working A/C. Clean California title.",
        endTime: now + 48 * hour,
        status: "active" as const,
        currentBid: 42500,
        bidCount: 37,
        reserveStatus: "met" as const,
        imageUrl: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&h=400&fit=crop",
      },
      {
        batId: "bat-201002",
        batUrl: "https://bringatrailer.com/listing/1974-bmw-2002-turbo-12",
        title: "1974 BMW 2002 Turbo",
        year: 1974,
        make: "BMW",
        model: "2002",
        subtitle: "Chamonix White / Turbo / Matching Numbers / Gruppe 2 Flares",
        location: "Scottsdale, AZ",
        sellerUsername: "bavarian_classics",
        description: "Rare 1974 BMW 2002 Turbo in Chamonix White with Gruppe 2 widebody flares. M10 2.0L turbo engine, original 4-speed transmission. Full documentation from new including original window sticker. Round rear taillights. Professionally maintained. Clean Arizona title.",
        endTime: now + 24 * hour,
        status: "active" as const,
        currentBid: 78000,
        bidCount: 52,
        reserveStatus: "met" as const,
        imageUrl: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop",
      },
      {
        batId: "bat-201003",
        batUrl: "https://bringatrailer.com/listing/1971-bmw-2002-s14-swap",
        title: "1971 BMW 2002 S14-Powered",
        year: 1971,
        make: "BMW",
        model: "2002",
        subtitle: "Colorado Orange / S14 Swap / 5-Speed / Track-Ready",
        location: "Portland, OR",
        sellerUsername: "pdx_vintage",
        description: "1971 BMW 2002 with professionally installed S14 engine swap from an E30 M3. Documented build by known BMW shop. 5-speed Getrag 265 transmission, custom shifter linkage, Koni adjustable suspension, front and rear sway bars, 15-inch BBS wheels, ducktail spoiler. Weber 40 DCOE carbs. Interior has Scheel Rally 400 seats. No A/C. Clean Oregon title.",
        endTime: now + 72 * hour,
        status: "active" as const,
        currentBid: 55000,
        bidCount: 28,
        reserveStatus: "not_met" as const,
        imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop",
      },
      {
        batId: "bat-201004",
        batUrl: "https://bringatrailer.com/listing/1972-bmw-2002-malaga",
        title: "1972 BMW 2002",
        year: 1972,
        make: "BMW",
        model: "2002",
        subtitle: "Malaga Red / Weber 32/36 / 4-Speed / Survivor",
        location: "Austin, TX",
        sellerUsername: "lone_star_bmw",
        description: "Honest driver-quality 1972 BMW 2002 in original Malaga Red. M10 2.0L with Weber 32/36 DGV carburetor upgrade. Original 4-speed manual. Light patina but no structural rust. Dash is crack-free. All gauges working. 15-inch Minilite wheels. New clutch installed 2024. No A/C. Clean Texas title.",
        endTime: now + 36 * hour,
        status: "active" as const,
        currentBid: 24500,
        bidCount: 19,
        reserveStatus: "unknown" as const,
        imageUrl: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=400&fit=crop",
      },
      {
        batId: "bat-201005",
        batUrl: "https://bringatrailer.com/listing/1975-bmw-2002-m42",
        title: "1975 BMW 2002 M42-Powered",
        year: 1975,
        make: "BMW",
        model: "2002",
        subtitle: "Fjord Blue / M42 Swap / 5-Speed / Restored",
        location: "Denver, CO",
        sellerUsername: "mile_high_02",
        description: "Beautifully restored 1975 BMW 2002 with M42 engine swap. Reliable and tuneable powerplant with documented installation. 5-speed conversion, upgraded suspension with Bilstein shocks, limited slip differential, upgraded exhaust. Recaro sport seats, working A/C retrofit. Front air dam. 15-inch Alpina-style wheels. Clean Colorado title.",
        endTime: now + 60 * hour,
        status: "active" as const,
        currentBid: 35000,
        bidCount: 22,
        reserveStatus: "met" as const,
        imageUrl: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&h=400&fit=crop",
      },
      {
        batId: "bat-201006",
        batUrl: "https://bringatrailer.com/listing/1970-bmw-2002-roundie",
        title: "1970 BMW 2002 Roundie",
        year: 1970,
        make: "BMW",
        model: "2002",
        subtitle: "Sahara Beige / Roundie / Weber DCOE / Sorted Driver",
        location: "Brooklyn, NY",
        sellerUsername: "brooklyn_02s",
        description: "Early 1970 BMW 2002 'roundie' with desirable round taillights. Sahara Beige over tan interior. M10 2.0L with Weber 40 DCOE sidedraft carbs. 4-speed manual. Bilstein suspension, 15-inch period-correct wheels. Crack-free dash, all gauges working. Some surface patina but rust-free floors and chassis. Clean NY title.",
        endTime: now + 18 * hour,
        status: "active" as const,
        currentBid: 31000,
        bidCount: 41,
        reserveStatus: "met" as const,
        imageUrl: "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&h=400&fit=crop",
      },
    ];

    const auctionIds: string[] = [];
    for (const auction of auctions) {
      const id = await ctx.db.insert("auctions", auction);
      auctionIds.push(id);
    }

    // Add attributes for each auction
    const attributeData = [
      { engine: "M10 2.0L Kugelfischer FI", transmission: "5-speed Getrag", color: "Inka Orange", mileage: "87,450", vin: "2761234567", titleStatus: "Clean", rustNotes: "None — full restoration", hasAc: true },
      { engine: "M10 2.0L Turbo", transmission: "4-speed manual", color: "Chamonix White", mileage: "62,100", vin: "2762345678", titleStatus: "Clean", rustNotes: "None", hasAc: false },
      { engine: "S14 2.3L (E30 M3 swap)", transmission: "5-speed Getrag 265", color: "Colorado Orange", mileage: "12,400 since build", vin: "2763456789", titleStatus: "Clean", rustNotes: "None — stripped and media-blasted during build", hasAc: false },
      { engine: "M10 2.0L Weber 32/36 DGV", transmission: "4-speed manual", color: "Malaga Red", mileage: "134,200", vin: "2764567890", titleStatus: "Clean", rustNotes: "Surface patina only, no structural rust", hasAc: false },
      { engine: "M42 1.8L (E30 swap)", transmission: "5-speed manual", color: "Fjord Blue", mileage: "8,200 since build", vin: "2765678901", titleStatus: "Clean", rustNotes: "None — full restoration", hasAc: true },
      { engine: "M10 2.0L Weber 40 DCOE", transmission: "4-speed manual", color: "Sahara Beige", mileage: "108,300", vin: "2766789012", titleStatus: "Clean", rustNotes: "Rust-free floors and chassis", hasAc: false },
    ];

    for (let i = 0; i < auctionIds.length; i++) {
      await ctx.db.insert("auctionAttributes", {
        auctionId: auctionIds[i] as any,
        ...attributeData[i],
      });
    }

    // Add bonus features
    const bonusData: Array<Array<{ featureKey: string; featureLabel: string; pointsDefault: number }>> = [
      // 1973 tii: AC, 5-speed, Recaro, track suspension
      [
        { featureKey: "has_ac", featureLabel: "Working Air Conditioning", pointsDefault: 5 },
        { featureKey: "has_5_speed", featureLabel: "5-Speed Getrag Conversion", pointsDefault: 2 },
        { featureKey: "recaro_seats", featureLabel: "Recaro Sport Seats", pointsDefault: 1 },
        { featureKey: "track_suspension", featureLabel: "Bilstein Suspension", pointsDefault: 1 },
      ],
      // 1974 Turbo: widebody, round taillights
      [
        { featureKey: "widebody", featureLabel: "Gruppe 2 Widebody Flares", pointsDefault: 2 },
        { featureKey: "round_taillights", featureLabel: "Round Rear Taillights", pointsDefault: 1 },
      ],
      // 1971 S14: S14 swap, 5-speed, track suspension, lightweight wheels, ducktail
      [
        { featureKey: "s14_swap", featureLabel: "S14 Engine Swap (E30 M3)", pointsDefault: 2 },
        { featureKey: "has_5_speed", featureLabel: "5-Speed Getrag 265", pointsDefault: 2 },
        { featureKey: "track_suspension", featureLabel: "Koni Adjustable Suspension", pointsDefault: 1 },
        { featureKey: "lightweight_wheels", featureLabel: "15\" BBS Wheels", pointsDefault: 1 },
      ],
      // 1972 Malaga: lightweight wheels
      [
        { featureKey: "lightweight_wheels", featureLabel: "15\" Minilite Wheels", pointsDefault: 1 },
      ],
      // 1975 M42: M42 swap, 5-speed, AC, Recaro, track suspension
      [
        { featureKey: "m42_swap", featureLabel: "M42 Engine Swap", pointsDefault: 1 },
        { featureKey: "has_5_speed", featureLabel: "5-Speed Conversion", pointsDefault: 2 },
        { featureKey: "has_ac", featureLabel: "Working A/C Retrofit", pointsDefault: 5 },
        { featureKey: "recaro_seats", featureLabel: "Recaro Sport Seats", pointsDefault: 1 },
        { featureKey: "track_suspension", featureLabel: "Bilstein Suspension", pointsDefault: 1 },
      ],
      // 1970 Roundie: round taillights
      [
        { featureKey: "round_taillights", featureLabel: "Round Rear Taillights (Roundie)", pointsDefault: 1 },
      ],
    ];

    for (let i = 0; i < auctionIds.length; i++) {
      for (const feature of bonusData[i]) {
        await ctx.db.insert("auctionBonusFeatures", {
          auctionId: auctionIds[i] as any,
          ...feature,
          source: "auto",
          confidence: 0.95,
        });
      }
    }

    return { seeded: true, count: auctions.length };
  },
});

// Admin mutation to set preferences for a specific user by userId
export const setPreferencesForUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    prefsJson: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        prefsJson: args.prefsJson,
        name: args.name,
      });
      return { id: existing._id, updated: true };
    } else {
      const id = await ctx.db.insert("userPreferences", {
        name: args.name,
        isDefault: false,
        prefsJson: args.prefsJson,
        userId: args.userId,
      });
      return { id, updated: false };
    }
  },
});
