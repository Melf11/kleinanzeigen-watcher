const priceFmt = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const dateFmt = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function useFormat() {
  function formatPrice(value: number | null | undefined): string {
    if (value == null) return 'VB / k. A.'
    return priceFmt.format(value)
  }

  function formatPriceShort(value: number | null | undefined): string {
    if (value == null) return '–'
    return priceFmt.format(value)
  }

  function formatDate(value: string | Date | null | undefined): string {
    if (!value) return '–'
    return dateFmt.format(new Date(value))
  }

  function fromNow(value: string | Date | null | undefined): string {
    if (!value) return '–'
    const d = new Date(value).getTime()
    const diff = Date.now() - d
    const min = Math.round(diff / 60000)
    if (min < 1) return 'gerade eben'
    if (min < 60) return `vor ${min} Min.`
    const h = Math.round(min / 60)
    if (h < 24) return `vor ${h} Std.`
    const days = Math.round(h / 24)
    if (days < 30) return `vor ${days} Tg.`
    const months = Math.round(days / 30)
    return `vor ${months} Mon.`
  }

  return { formatPrice, formatPriceShort, formatDate, fromNow }
}
