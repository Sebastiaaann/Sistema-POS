/**
 * Validaciones reutilizables
 * 
 * Este archivo contendrá validaciones comunes que se reutilizan en múltiples schemas
 */

import { z } from 'zod';

/**
 * Mensajes de error en español
 */
export const errorMessages = {
    required: 'Este campo es requerido',
    invalidEmail: 'Email inválido',
    minLength: (min: number) => `Mínimo ${min} caracteres`,
    maxLength: (max: number) => `Máximo ${max} caracteres`,
    positiveNumber: 'Debe ser un número positivo',
    integer: 'Debe ser un número entero',
    invalidUrl: 'URL inválida',
    invalidSlug: 'Solo letras minúsculas, números y guiones',
    minValue: (min: number) => `El valor mínimo es ${min}`,
    maxValue: (max: number) => `El valor máximo es ${max}`,
};

/**
 * Validación de email
 */
export const emailSchema = z
    .string({ message: errorMessages.required })
    .email({ message: errorMessages.invalidEmail })
    .toLowerCase()
    .trim();

/**
 * Validación de contraseña
 */
export const passwordSchema = z
    .string({ message: errorMessages.required })
    .min(6, { message: errorMessages.minLength(6) });

/**
 * Validación de slug (para URLs amigables)
 */
export const slugSchema = z
    .string({ message: errorMessages.required })
    .min(3, { message: errorMessages.minLength(3) })
    .max(50, { message: errorMessages.maxLength(50) })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: errorMessages.invalidSlug,
    })
    .toLowerCase()
    .trim();

/**
 * Validación de SKU (código de producto)
 */
export const skuSchema = z
    .string({ message: errorMessages.required })
    .min(2, { message: errorMessages.minLength(2) })
    .max(50, { message: errorMessages.maxLength(50) })
    .toUpperCase()
    .trim();

/**
 * Validación de precio (número positivo con hasta 2 decimales)
 */
export const priceSchema = z
    .number({ message: errorMessages.required })
    .positive({ message: errorMessages.positiveNumber })
    .finite()
    .safe();

/**
 * Validación de cantidad/stock (número entero positivo)
 */
export const quantitySchema = z
    .number({ message: errorMessages.required })
    .int({ message: errorMessages.integer })
    .nonnegative({ message: errorMessages.positiveNumber })
    .safe();

/**
 * Validación de URL opcional
 */
export const urlSchema = z
    .string()
    .url({ message: errorMessages.invalidUrl })
    .optional()
    .or(z.literal(''));

/**
 * Validación de texto simple
 */
export const textSchema = (min: number = 1, max: number = 255) =>
    z
        .string({ message: errorMessages.required })
        .min(min, { message: errorMessages.minLength(min) })
        .max(max, { message: errorMessages.maxLength(max) })
        .trim();

/**
 * Validación de texto opcional
 */
export const optionalTextSchema = (max: number = 500) =>
    z
        .string()
        .max(max, { message: errorMessages.maxLength(max) })
        .trim()
        .optional()
        .or(z.literal(''));
