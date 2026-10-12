'use server'

import { calculateDrivingDistance, DistanceResult } from '@/lib/distance'

export async function getDistance(fromAddress: string, toAddress: string): Promise<DistanceResult> {
  return await calculateDrivingDistance(fromAddress, toAddress)
}
