export const wait = (seconds: number) => {
  const milliseconds = seconds * 1000
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export const shortenAddress = (address: string) => {
  return `0x...${address.slice(-4)}`
}
