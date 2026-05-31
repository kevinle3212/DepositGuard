export const nestCrowClientTools = {
  openLeasePage: (params: { leaseId: string; path?: string }) => {
    const segment = params.path ?? 'assessment'
    window.location.assign(`/lease/${params.leaseId}/${segment}`)
    return 'ok'
  },
}
