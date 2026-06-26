migrate(
  (app) => {
    const sellers = app.findRecordsByFilter('sellers', '1=1', '', 10000, 0)
    const users = app.findRecordsByFilter('users', '1=1', '', 10000, 0)

    const cleanStr = (val) => {
      if (val == null) return ''
      let s = String(val).trim().toLowerCase().replace(/\s+/g, ' ')
      if (s.match(/^-?[0-9]+\.0$/)) {
        s = s.substring(0, s.length - 2)
      }
      if (s.match(/^[0-9]+$/)) {
        s = parseInt(s, 10).toString()
      }
      return s
    }

    let linked = 0
    for (const seller of sellers) {
      if (!seller.getString('user_id')) {
        const sellerNameOrCode1 = cleanStr(seller.getString('name'))
        const sellerNameOrCode2 = cleanStr(seller.getString('code'))

        const matchedUser = users.find((u) => {
          const uName = cleanStr(u.getString('name'))
          const uEmail = cleanStr(u.getString('email'))

          const nameMatch = uName && (uName === sellerNameOrCode1 || uName === sellerNameOrCode2)
          const emailMatch =
            uEmail && (uEmail === sellerNameOrCode1 || uEmail === sellerNameOrCode2)

          return nameMatch || emailMatch
        })

        if (matchedUser) {
          seller.set('user_id', matchedUser.id)
          app.save(seller)
          linked++
        }
      }
    }
    console.log(`Linked ${linked} sellers to users.`)
  },
  (app) => {
    // No down migration needed
  },
)
