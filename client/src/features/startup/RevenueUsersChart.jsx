import React, { useMemo } from 'react'
import ReactApexChart from 'react-apexcharts'

export default function RevenueUsersChart({ revenueSeries = [], usersSeries = [] }) {
  const chartData = useMemo(() => {
    const categories = revenueSeries.map((point) => point?.x)
    const revenueData = revenueSeries.map((point) => Number(point?.y || 0))

    const usersByMonth = new Map(usersSeries.map((point) => [point?.x, Number(point?.y || 0)]))
    const usersData = categories.map((month) => usersByMonth.get(month) ?? 0)

    return {
      categories,
      series: [
        {
          name: 'Revenue',
          type: 'area',
          data: revenueData,
        },
        {
          name: 'Users',
          type: 'line',
          data: usersData,
        },
      ],
    }
  }, [revenueSeries, usersSeries])

  const options = useMemo(
    () => ({
      chart: {
        type: 'line',
        stacked: false,
        toolbar: { show: true },
        zoom: { enabled: false },
      },
      stroke: {
        width: [2, 3],
        curve: 'smooth',
      },
      fill: {
        type: ['gradient', 'solid'],
        gradient: {
          shadeIntensity: 0.4,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      dataLabels: {
        enabled: false,
      },
      markers: {
        size: [0, 4],
      },
      tooltip: {
        enabled: true,
        shared: true,
        intersect: false,
      },
      legend: {
        position: 'top',
      },
      xaxis: {
        categories: chartData.categories,
        title: {
          text: 'Month',
        },
      },
      yaxis: [
        {
          title: {
            text: 'Revenue',
          },
          labels: {
            formatter: (value) => `₹${Math.round(value).toLocaleString('en-IN')}`,
          },
        },
        {
          opposite: true,
          title: {
            text: 'Users',
          },
          labels: {
            formatter: (value) => `${Math.round(value).toLocaleString('en-IN')}`,
          },
        },
      ],
      responsive: [
        {
          breakpoint: 1024,
          options: {
            legend: {
              position: 'bottom',
            },
          },
        },
      ],
      noData: {
        text: 'No chart data available',
      },
    }),
    [chartData.categories]
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Revenue vs Users</h3>
      <ReactApexChart options={options} series={chartData.series} type="line" height={360} />
    </div>
  )
}
