import { prisma } from '@/lib/db';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const maintenanceRouter = createTRPCRouter({
  getStats: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { propertyId } = input;

      // Get maintenance requests with filtering
      const requests = await prisma.maintenanceRequest.findMany({
        where: {
          propertyId: propertyId,
        },
        orderBy: [
          {
            priority: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
        include: {
          room: true,
        },
        take: 5, // Only get the 5 most recent requests
      });

      // Get request statistics
      const stats = {
        total: await prisma.maintenanceRequest.count({
          where: {
            propertyId: propertyId,
          },
        }),
        pending: await prisma.maintenanceRequest.count({
          where: {
            propertyId: propertyId,
            status: 'PENDING',
          },
        }),
        inProgress: await prisma.maintenanceRequest.count({
          where: {
            propertyId: propertyId,
            status: 'IN_PROGRESS',
          },
        }),
        completed: await prisma.maintenanceRequest.count({
          where: {
            propertyId: propertyId,
            status: 'COMPLETED',
          },
        }),
      };

      return {
        requests: requests.map(request => ({
          id: request.id,
          description: request.description,
          status: request.status,
          priority: request.priority,
          createdAt: request.createdAt,
          room: request.room.number,
        })),
        stats,
      };
    }),

  getRequests: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
      })
    )
    .query(async ({ input }) => {
      const { propertyId, status } = input;

      // Get maintenance requests with filtering
      const requests = await prisma.maintenanceRequest.findMany({
        where: {
          propertyId: propertyId,
          ...(status ? { status } : {}),
        },
        orderBy: [
          {
            priority: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
        include: {
          room: true,
        },
      });

      // Get request statistics
      const stats = {
        total: await prisma.maintenanceRequest.count({
          where: {
            propertyId: propertyId,
          },
        }),
        pending: await prisma.maintenanceRequest.count({
          where: {
            propertyId: propertyId,
            status: 'PENDING',
          },
        }),
        inProgress: await prisma.maintenanceRequest.count({
          where: {
            propertyId: propertyId,
            status: 'IN_PROGRESS',
          },
        }),
        completed: await prisma.maintenanceRequest.count({
          where: {
            propertyId: propertyId,
            status: 'COMPLETED',
          },
        }),
      };

      return {
        requests: requests.map(request => ({
          id: request.id,
          title: request.title,
          description: request.description,
          status: request.status,
          priority: request.priority,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          roomNumber: request.room.number,
        })),
        stats,
      };
    }),
});
