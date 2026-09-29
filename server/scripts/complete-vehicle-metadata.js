import { connect, close, transaction } from "../src/db.js"

// Fill only missing fields of the known Figma starter vehicles after migration.
try {
  await connect()
  const changed = await transaction(async db => {
    let count = 0
    const plates = ["สาย 2591", "สาย 2599", "สาย 2588", "บก 1130", "บก 2244"]
    for (let i = 0; i < plates.length; i++) {
      const result = await db.execute("UPDATE BUS_VEHICLES SET brand=COALESCE(brand,TO_NCHAR(:brand)),model_year=COALESCE(model_year,:modelYear) WHERE vehicle_id=:vehicleId AND license_plate=:plate AND (brand IS NULL OR model_year IS NULL)", {
        vehicleId: "V00" + (i + 1), plate: plates[i], brand: i < 3 ? "Toyota Commuter" : "Hino Bus", modelYear: [2563,2564,2562,2561,2565][i]
      })
      count += result.rowsAffected
    }
    return count
  })
  console.log("Filled missing starter vehicle metadata:", changed)
} finally { await close() }

