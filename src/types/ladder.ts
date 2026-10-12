export interface LadderFareItem {
  id: string
  floorName: string
  minFloor: number
  maxFloor: number
  cost1Ton: number
  cost2_5Ton: number
  cost5Ton: number
  cost6Ton: number
  cost7_5Ton: number
  cost10Ton: number
  note?: string | null
  order: number
}
