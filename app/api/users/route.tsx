import { db, users } from "@/db";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();

        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json(
                { error: "Unauthorized: Missing authentication session or email" },
                { status: 401 }
            );
        }

        const clerkId = user.id;
        const email = user.primaryEmailAddress.emailAddress;

        const name =
            [user.firstName, user.lastName]
                .filter(Boolean)
                .join(" ") || null;

        const userResult = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        if (userResult.length === 0) {
            const newUser = await db
                .insert(users)
                .values({
                    clerkId,
                    email,
                    name,
                })
                .returning();

            return NextResponse.json({
                user: newUser[0],
            });
        }

        // Existing user: make sure the Clerk ID is associated.
        const existingUser = userResult[0];

        if (existingUser.clerkId !== clerkId) {
            const updatedUser = await db
                .update(users)
                .set({
                    clerkId,
                    name,
                })
                .where(eq(users.id, existingUser.id))
                .returning();

            return NextResponse.json({
                user: updatedUser[0],
            });
        }

        return NextResponse.json({
            user: existingUser,
        });
    } catch (error) {
        console.error("Error in POST /api/users:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal Server Error",
            },
            { status: 500 }
        );
    }
}