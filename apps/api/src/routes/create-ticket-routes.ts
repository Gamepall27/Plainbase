import type { TicketResponse, TicketsResponse } from "@plainbase/shared";
import { Router } from "express";
import { requirePermission } from "../middleware/require-permission.js";
import { TicketService } from "../services/ticket-service.js";
import { readRouteParam } from "../services/validation.js";
import { canCreateTicket, canEditTicket } from "@plainbase/shared";

export function createTicketRoutes(ticketService: TicketService) {
  const router = Router();

  router.get("/workspaces/:workspaceId/tickets", (request, response) => {
    const workspaceId = readRouteParam(request.params, "workspaceId");
    const payload: TicketsResponse = {
      success: true,
      data: {
        tickets: ticketService.listTicketsByWorkspace(workspaceId, request.auth)
      }
    };

    response.json(payload);
  });

  router.post(
    "/tickets",
    requirePermission(
      canCreateTicket,
      "The active user cannot create tickets."
    ),
    (request, response) => {
      const payload: TicketResponse = {
        success: true,
        data: {
          ticket: ticketService.createTicket(request.body, request.auth)
        }
      };

      response.status(201).json(payload);
    }
  );

  router.put(
    "/tickets/:ticketId",
    requirePermission(
      canEditTicket,
      "The active user cannot edit tickets."
    ),
    (request, response) => {
      const ticketId = readRouteParam(request.params, "ticketId");
      const payload: TicketResponse = {
        success: true,
        data: {
          ticket: ticketService.updateTicket(ticketId, request.body, request.auth)
        }
      };

      response.json(payload);
    }
  );

  return router;
}
