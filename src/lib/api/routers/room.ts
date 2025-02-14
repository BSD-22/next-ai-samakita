import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { RoomType } from "@prisma/client";
import { prisma } from "@/lib/db";

const roomSchema = z.object({
  number: z.string().min(1, "Room number is required"),
  type: z.nativeEnum(RoomType),
  size: z.number().min(1, "Size must be greater than 0"),
  amenities: z.array(z.string()).min(1, "At least one amenity is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  propertyId: z.string().min(1, "Property ID is required"),
});

export const roomRouter = createTRPCRouter({
  create: protectedProcedure.input(roomSchema).mutation(async ({ input, ctx }) => {
    // Check if property exists and user has access
    const property = await db.property.findUnique({
      where: { id: input.propertyId },
    });

    if (!property) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Property not found",
      });
    }

    if (property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to add rooms to this property",
      });
    }

    // Check if room number already exists in the property
    const existingRoom = await db.room.findFirst({
      where: {
        propertyId: input.propertyId,
        number: input.number,
      },
    });

    if (existingRoom) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Room number already exists in this property",
      });
    }

    return db.room.create({
      data: input,
    });
  }),

  list: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        status: z.enum(["available", "occupied", "maintenance"]).optional(),
      })
    )
    .query(async ({ input }) => {
      return prisma.room.findMany({
        where: {
          propertyId: input.propertyId,
          ...(input.status === "available" && {
            tenants: {
              none: {
                endDate: {
                  gt: new Date(),
                },
              },
            },
          }),
          ...(input.status === "occupied" && {
            tenants: {
              some: {
                endDate: {
                  gt: new Date(),
                },
              },
            },
          }),
        },
        include: {
          tenants: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          property: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      });
    }),

  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const room = await prisma.room.findUnique({
        where: { id: input.id },
        include: {
          tenants: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          property: {
            select: {
              name: true,
              address: true,
              description: true,
              location: true,
              facilities: true,
              images: true,
            },
          },
        },
      });

      if (!room) {
        throw new Error("Room not found");
      }

      return room;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: roomSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const room = await db.room.findUnique({
        where: { id: input.id },
        include: {
          property: true,
        },
      });

      if (!room) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found",
        });
      }

      if (room.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this room",
        });
      }

      return db.room.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const room = await db.room.findUnique({
      where: { id: input.id },
      include: {
        property: true,
      },
    });

    if (!room) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Room not found",
      });
    }

    if (room.property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to delete this room",
      });
    }

    await db.room.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),
});
