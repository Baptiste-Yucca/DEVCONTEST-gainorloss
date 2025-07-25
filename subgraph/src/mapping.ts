import { BigInt } from "@graphprotocol/graph-ts"
import { Transfer as TransferEvent } from "../generated/armmUSDC/ERC20"
import { Transfer } from "../generated/schema"

export function handleTransfer(event: TransferEvent): void {
  // Vérifier que la transaction est réussie
  if (event.receipt == null || event.receipt!.status.toI32() == 0) {
    return
  }

  let transfer = new Transfer(
    event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())
  )
  
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.amount = event.params.value
  transfer.hashId = event.transaction.hash
  transfer.timestamp = event.block.timestamp
  
  // Identifier le token basé sur l'adresse du contrat
  if (event.address.toHexString() == "0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1") {
    transfer.token = "armmUSDC"
  } else if (event.address.toHexString() == "0x0ca4f5554dd9da6217d62d8df2816c82bba4157b") {
    transfer.token = "armmWXDAI"
  } else {
    transfer.token = "unknown"
  }
  
  transfer.save()
} 