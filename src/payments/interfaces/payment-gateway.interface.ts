import { PaymentProvider } from "@prisma/client";

export interface PaymentDetails {
    status: string;
    externalId: string; // Nuestro UUID
}

export interface PaymentGateway {
    /**
     * Genera una preferencia de pago (link de pago)
     * @param amount Monto a cobrar
     * @param email Email del pagador
     * @param description Descripción del producto/servicio
     */
    createPaymentLink(
        amount: number,
        email: string,
        description: string,
        externalId: string,
    ): Promise<string>;

    /**
     * Genera una suscripción de pago (link de suscripción)
     * @param price Monto a cobrar
     * @param email Email del pagador
     * @param reason Descripción del producto/servicio
     * @param frequency Frecuencia de la suscripción (en meses)
    */
    createSubscription(
        price: number,
        email: string,
        reason: string,
        frequency: number, // en meses
        externalId: string,
    ): Promise<string>;

    /**
     * Busca suscripciones de un usuario
     * @param email Email del usuario
     */
    searchSubscriptions(email?: string): Promise<any[]>;

    /**
     * Verifica el estado de una transacción
     * @param id ID de la transacción del proveedor
     */
    getPaymentStatus(id: string): Promise<PaymentDetails>;

    /**
     * Verifica el estado de una suscripción
     * @param id ID de la suscripción del proveedor
     */
    getSubscriptionStatus(id: string): Promise<PaymentDetails>;

    // Identificador del proveedor (MERCADOPAGO, STRIPE, etc.)
    provider: PaymentProvider;
}