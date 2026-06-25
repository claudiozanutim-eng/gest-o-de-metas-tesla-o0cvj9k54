migrate(
  (app) => {
    const regionals = app.findRecordsByFilter('regionals', '1=1', '', 100, 0)

    const colors = {
      1: '#34a853',
      2: '#673ab7',
      3: '#ff9800',
      4: '#ffeb3b',
      5: '#42a5f5',
      6: '#f44336',
      7: '#ff7043',
      8: '#9e9e9e',
      0: '#e91e63',
    }

    for (const reg of regionals) {
      const name = reg.getString('name')
      const match = name.match(/\b(0|1|2|3|4|5|6|7|8)\b/)
      if (match && colors[match[1]]) {
        reg.set('color_code', colors[match[1]])
        app.saveNoValidate(reg)
      }
    }
  },
  (app) => {
    // Down migration empty - cannot reliably revert dynamically modified color codes without history.
  },
)
