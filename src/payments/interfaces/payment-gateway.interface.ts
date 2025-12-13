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
        description: string
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
    ): Promise<string>;

    /**
     * Verifica el estado de una transacción
     * @param id ID de la transacción del proveedor
     */
    getPaymentStatus(id: string): Promise<string>;
}