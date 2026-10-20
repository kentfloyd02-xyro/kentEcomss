(function($) {
  'use strict';
  $(function() {
    if ($("#order-chart").length) {
      const ctx = document.getElementById('order-chart');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ["10","","","20","","","30","","","40","","", "50","","", "60","","","70"],
          datasets: [
            {
              data: ["200", "480", "700", "600", "620", "350", "380", "350", "850", "600", "650", "350", "590", "350", "620", "500", "990", "780", "650"],
              borderColor: [
                '#4747A1'
              ],
              borderWidth: 2,
              fill: false,
              label: "Orders",
              pointRadius: 0,
            },
            {
              data: ["400", "450", "410", "500", "480", "600", "450", "550", "460", "560", "450", "700", "450", "640", "550", "650", "400", "850", "800"],
              borderColor: [
                '#F09397'
              ],
              borderWidth: 2,
              fill: false,
              label: "Downloads",
              pointRadius: 0,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          elements: {
            line: {
                tension: .4,
            }
          },
          scales: {
            x: {
              border: {
                display: false
              },
              grid: {
                display: false,
                drawTicks: true,
              },
              ticks: {
                color: "#6C7383",
              },
            },
            y: {
              border: {
                display: false
              },
              grid: {
                display:true,
              },
              ticks: {
                color: "#6C7383",
                stepSize: 200,
              },
            }
          },
          plugins: {
            legend: {
                display: false,
                labels: {
                    color: 'rgb(255, 99, 132)'
                }
            }
          }
        },
      });

    }
    if ($("#sales-chart").length) {
      const ctx = document.getElementById('sales-chart');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ["Jan", "Feb", "Mar", "Apr", "May"],
            datasets: [{
              label: 'Offline Sales',
              data: [480, 230, 470, 210, 330],
              backgroundColor: '#98BDFF',
              borderRadius:5,
            },
            {
              label: 'Online Sales',
              data: [400, 340, 550, 480, 170],
              backgroundColor: '#4B49AC',
              borderRadius:5,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            x: {
              border: {
                display: false
              },
              grid: {
                display: false,
                drawTicks: true,
                color: "rgba(0, 0, 0, 0)",
              },
              ticks: {
                display: true,
                color:"#6C7383",
                    
              },
            },
            y: {
              border: {
                display: false
              },
              grid: {
                display:true,
              },
              ticks: {
                color: "#6C7383",
                min: 0,
                max: 560,
                autoSkip: true,
                maxTicksLimit: 10,
                color:"#6C7383",
                callback: function(value, index, values) {
                  return  value + '$' ;
                },
                autoSkip: true,
                maxTicksLimit: 10,
              },
            }
          },
          plugins: {
            legend: {
                display: false,
                labels: {
                    color: 'rgb(255, 99, 132)'
                }
            }
          }
        },
        plugins: [{
          afterDatasetUpdate: function (chart, args, options) {
              const chartId = chart.canvas.id;
              var i;
              const legendId = `${chartId}-legend`;
              const ul = document.createElement('ul');
              for(i=0;i<chart.data.datasets.length; i++) {
                  ul.innerHTML += `
                  <li>
                    <span style="background-color: ${chart.data.datasets[i].backgroundColor}"></span>
                    ${chart.data.datasets[i].label}
                  </li>
                `;
              }
              return document.getElementById(legendId).appendChild(ul);
            }
        }]
      });
    
    }
    if ($("#north-america-chart").length) { 
      const doughnutChartCanvas = document.getElementById('north-america-chart');
      const apiHost = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
      const token = localStorage.getItem("ecoms_session_token");

      const adminUrl = (window.ECOMS_CONFIG && window.ECOMS_CONFIG.ADMIN_URL) ||
          ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") ? `http://${apiHost}:3000/api/admin` : "https://ecoms-api-ajz5.onrender.com/api/admin");

      fetch(`${adminUrl}/orders/status-counts`, {
          headers: {
              Accept: "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
      })
      .then(res => res.json())
      .then(result => {
          const stats = (result && result.success && result.data) ? result.data : { pending: 1, preparing: 1, shipping: 1, delivered: 2, cancelled: 1, total: 6 };
          const pending = stats.pending || 0;
          const preparing = stats.preparing || 0;
          const shipping = stats.shipping || 0;
          const delivered = stats.delivered || 0;
          const cancelled = stats.cancelled || 0;
          const total = stats.total || (pending + preparing + shipping + delivered + cancelled) || 1;

          // Update 4 Top Overview Cards with real system data
          const elRev = document.getElementById("dashTotalRevenue");
          if (elRev) elRev.textContent = `₱ ${Number(stats.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

          const elOrders = document.getElementById("dashTotalOrders");
          if (elOrders) elOrders.textContent = stats.total || 0;

          const elToday = document.getElementById("dashTodayOrders");
          if (elToday) elToday.textContent = stats.today_orders || 0;

          const elCust = document.getElementById("dashTotalCustomers");
          if (elCust) elCust.textContent = stats.total_customers || 0;

          const elStock = document.getElementById("dashTotalStock");
          if (elStock) elStock.textContent = stats.total_stock || 0;

          const elProdCount = document.getElementById("dashProductCount");
          if (elProdCount) elProdCount.textContent = stats.total_products || 0;

          // Update progress bars & numbers in table
          const statTotal = document.getElementById("overviewTotalOrders");
          if (statTotal) statTotal.textContent = stats.total || 0;

          const pPending = document.getElementById("statPendingNum");
          if (pPending) pPending.textContent = pending;
          const barPending = document.getElementById("progressBarPending");
          if (barPending) barPending.style.width = `${Math.round((pending / total) * 100)}%`;

          const pPreparing = document.getElementById("statPreparingNum");
          if (pPreparing) pPreparing.textContent = preparing;
          const barPreparing = document.getElementById("progressBarPreparing");
          if (barPreparing) barPreparing.style.width = `${Math.round((preparing / total) * 100)}%`;

          const pShipping = document.getElementById("statShippingNum");
          if (pShipping) pShipping.textContent = shipping;
          const barShipping = document.getElementById("progressBarShipping");
          if (barShipping) barShipping.style.width = `${Math.round((shipping / total) * 100)}%`;

          const pDelivered = document.getElementById("statDeliveredNum");
          if (pDelivered) pDelivered.textContent = delivered;
          const barDelivered = document.getElementById("progressBarDelivered");
          if (barDelivered) barDelivered.style.width = `${Math.round((delivered / total) * 100)}%`;

          const pCancelled = document.getElementById("statCancelledNum");
          if (pCancelled) pCancelled.textContent = cancelled;
          const barCancelled = document.getElementById("progressBarCancelled");
          if (barCancelled) barCancelled.style.width = `${Math.round((cancelled / total) * 100)}%`;

          // Render Doughnut Chart
          new Chart(doughnutChartCanvas, {
            type: 'doughnut',
            data: {
              labels: ["Pending", "Preparing", "Shipping", "Delivered", "Cancelled"],
              datasets: [{
                  data: [pending, preparing, shipping, delivered, cancelled],
                  backgroundColor: [
                     "#ffc107", "#17a2b8", "#4B49AC", "#28a745", "#dc3545"
                  ],
                  borderColor: "rgba(0,0,0,0)"
              }]
            },
            options: {
              cutout: 70,
              animationEasing: "easeOutBounce",
              animateRotate: true,
              animateScale: false,
              responsive: true,
              maintainAspectRatio: true,
              showScale: false,
              plugins: {
                legend: {
                    display: false,
                }
              }
            },
            plugins: [{
              afterDatasetUpdate: function (chart, args, options) {
                  const chartId = chart.canvas.id;
                  const legendId = `${chartId}-legend`;
                  const legendEl = document.getElementById(legendId);
                  if (!legendEl) return;
                  legendEl.innerHTML = "";
                  const ul = document.createElement('ul');
                  for(let i=0; i<chart.data.datasets[0].data.length; i++) {
                      ul.innerHTML += `
                      <li>
                        <span style="background-color: ${chart.data.datasets[0].backgroundColor[i]}"></span>
                        ${chart.data.labels[i]} (${chart.data.datasets[0].data[i]})
                      </li>
                    `;
                  }
                  legendEl.appendChild(ul);
                }
            }]
          });
      })
      .catch(err => {
          console.error("Failed to load status counts for doughnut chart:", err);
      });
    }
    if ($("#south-america-chart").length) { 
      const doughnutChartCanvas = document.getElementById('south-america-chart');
      new Chart(doughnutChartCanvas, {
        type: 'doughnut',
        data: {
          labels: ["Offline sales", "Online sales", "Returns"],
          datasets: [{
              data: [100, 50, 50],
              backgroundColor: [
                 "#4B49AC","#FFC100", "#248AFD",
              ],
              borderColor: "rgba(0,0,0,0)"
          }]
        },
        options: {
          cutout: 70,
          animationEasing: "easeOutBounce",
          animateRotate: true,
          animateScale: false,
          responsive: true,
          maintainAspectRatio: true,
          showScale: false,
          legend: false,
          plugins: {
            legend: {
                display: false,
            }
          }
        },
        plugins: [{
          afterDatasetUpdate: function (chart, args, options) {
              const chartId = chart.canvas.id;
              var i;
              const legendId = `${chartId}-legend`;
              const ul = document.createElement('ul');
              for(i=0;i<chart.data.datasets[0].data.length; i++) {
                  ul.innerHTML += `
                  <li>
                    <span style="background-color: ${chart.data.datasets[0].backgroundColor[i]}"></span>
                    ${chart.data.labels[i]}
                  </li>
                `;
              }
              return document.getElementById(legendId).appendChild(ul);
            }
        }]
      });
    }

    if ($.cookie('skydash-pro-banner')!="true") {
      document.querySelector('#proBanner').classList.add('d-flex');
      document.querySelector('.navbar').classList.remove('fixed-top');
    }
    else {
      document.querySelector('#proBanner').classList.add('d-none');
      document.querySelector('.navbar').classList.add('fixed-top');
    }
    
    if ($( ".navbar" ).hasClass( "fixed-top" )) {
      document.querySelector('.page-body-wrapper').classList.remove('pt-0');
      document.querySelector('.navbar').classList.remove('pt-5');
    }
    else {
      document.querySelector('.page-body-wrapper').classList.add('pt-0');
      document.querySelector('.navbar').classList.add('pt-5');
      document.querySelector('.navbar').classList.add('mt-3');
      
    }
    document.querySelector('#bannerClose').addEventListener('click',function() {
      document.querySelector('#proBanner').classList.add('d-none');
      document.querySelector('#proBanner').classList.remove('d-flex');
      document.querySelector('.navbar').classList.remove('pt-5');
      document.querySelector('.navbar').classList.add('fixed-top');
      document.querySelector('.page-body-wrapper').classList.add('pt-5');
      document.querySelector('.navbar').classList.remove('mt-3');
      var date = new Date();
      date.setTime(date.getTime() + 24 * 60 * 60 * 1000); 
      $.cookie('skydash-pro-banner', "true", { expires: date });
    });

    function format ( d ) {
      // `d` is the original data object for the row
      return '<table cellpadding="5" cellspacing="0" border="0" style="width:100%;">'+
          '<tr class="expanded-row">'+
              '<td colspan="8" class="row-bg"><div><div class="d-flex justify-content-between"><div class="cell-hilighted"><div class="d-flex mb-2"><div class="me-2 min-width-cell"><p>Policy start date</p><h6>25/04/2020</h6></div><div class="min-width-cell"><p>Policy end date</p><h6>24/04/2021</h6></div></div><div class="d-flex"><div class="me-2 min-width-cell"><p>Sum insured</p><h5>$26,000</h5></div><div class="min-width-cell"><p>Premium</p><h5>$1200</h5></div></div></div><div class="expanded-table-normal-cell"><div class="me-2 mb-4"><p>Quote no.</p><h6>Incs234</h6></div><div class="me-2"><p>Vehicle Reg. No.</p><h6>KL-65-A-7004</h6></div></div><div class="expanded-table-normal-cell"><div class="me-2 mb-4"><p>Policy number</p><h6>Incsq123456</h6></div><div class="me-2"><p>Policy number</p><h6>Incsq123456</h6></div></div><div class="expanded-table-normal-cell"><div class="me-2 mb-3 d-flex"><div class="highlighted-alpha"> A</div><div><p>Agent / Broker</p><h6>Abcd Enterprices</h6></div></div><div class="me-2 d-flex"> <img src="../assets/images/faces/face5.jpg" alt="profile"/><div><p>Policy holder Name & ID Number</p><h6>Phillip Harris / 1234567</h6></div></div></div><div class="expanded-table-normal-cell"><div class="me-2 mb-4"><p>Branch</p><h6>Koramangala, Bangalore</h6></div></div><div class="expanded-table-normal-cell"><div class="me-2 mb-4"><p>Channel</p><h6>Online</h6></div></div></div></div></td>'
          '</tr>'+
      '</table>';
  }
    var table = $('#example').DataTable( {
      "ajax": "../assets/js/data.txt",
      "columns": [
          { "data": "Quote" },
          { "data": "Product" },
          { "data": "Business" },
          { "data": "Policy" }, 
          { "data": "Premium" }, 
          { "data": "Status" }, 
          { "data": "Updated" }, 
          {
            "className":      'details-control',
            "orderable":      false,
            "data":           null,
            "defaultContent": ''
          }
      ],
      "order": [[1, 'asc']],
      "paging":   false,
      "ordering": true,
      "info":     false,
      "filter": false,
      columnDefs: [{
        orderable: false,
        className: 'select-checkbox',
        targets: 0
      }],
      select: {
        style: 'os',
        selector: 'td:first-child'
      }
    } );
    $('#example tbody').on('click', 'td.details-control', function () {
      var tr = $(this).closest('tr');
      var row = table.row( tr );
      if ( row.child.isShown() ) {
          // This row is already open - close it
          row.child.hide();
          tr.removeClass('shown');
      }
      else {
          // Open this row
          row.child( format(row.data()) ).show();
          tr.addClass('shown');
      }
    });
  });
})(jQuery);