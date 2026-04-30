import { prisma } from "./config/db" // adjust path if needed

async function main() {
  console.log("Testing database connection...")

  try {
    const newUser = await prisma.user.create({
      data: {
        name: "Test User",
        email: `test-${Date.now()}@sentinelx.com`,
      },
    })

    console.log("Successfully inserted user:", newUser)

    const allUsers = await prisma.user.findMany()
    console.log("Current user count:", allUsers.length)

  } catch (error) {
    console.error("Database operation failed:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()