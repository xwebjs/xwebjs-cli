_x.exportModule(
  {
    imports: []
  },
  function () {
    return _x.createCls(
      {
        props: {
          isShapeInit: false
        },
        methods: {
          drawShape: function () {
            console.log('draw shape')
            this.isShapeInit = true
          }
        }
      }
    )
  }
)
