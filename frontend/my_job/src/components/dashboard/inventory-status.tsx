// src/components/dashboard/inventory-status.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CubeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface InventoryItem {
  id: string
  name: string
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstock'
  category: string
}

const inventoryItems: InventoryItem[] = [
  {
    id: '1',
    name: 'HVAC Filters',
    currentStock: 5,
    minStock: 10,
    maxStock: 50,
    unit: 'pcs',
    status: 'low-stock',
    category: 'HVAC Parts',
  },
  {
    id: '2',
    name: 'Light Bulbs (LED)',
    currentStock: 0,
    minStock: 20,
    maxStock: 100,
    unit: 'pcs',
    status: 'out-of-stock',
    category: 'Electrical',
  },
  {
    id: '3',
    name: 'Cleaning Supplies',
    currentStock: 25,
    minStock: 15,
    maxStock: 40,
    unit: 'bottles',
    status: 'in-stock',
    category: 'Maintenance',
  },
  {
    id: '4',
    name: 'Safety Equipment',
    currentStock: 8,
    minStock: 10,
    maxStock: 30,
    unit: 'sets',
    status: 'low-stock',
    category: 'Safety',
  },
]

const statusColors = {
  'in-stock': 'bg-green-100 text-green-800',
  'low-stock': 'bg-yellow-100 text-yellow-800',
  'out-of-stock': 'bg-red-100 text-red-800',
  'overstock': 'bg-blue-100 text-blue-800',
}

export function InventoryStatus() {
  const lowStockCount = inventoryItems.filter(item => item.status === 'low-stock').length
  const outOfStockCount = inventoryItems.filter(item => item.status === 'out-of-stock').length

  const getStockPercentage = (item: InventoryItem) => {
    return Math.min((item.currentStock / item.maxStock) * 100, 100)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Inventory Status</CardTitle>
        <Link href="/inventory">
          <Button variant="secondary" size="sm">
            <CubeIcon className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {/* Inventory Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <div className="text-sm text-red-700">Out of Stock</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
            <div className="text-sm text-yellow-700">Low Stock</div>
          </div>
        </div>

        {/* Critical Items */}
        <div className="space-y-3">
          {inventoryItems
            .filter(item => item.status === 'out-of-stock' || item.status === 'low-stock')
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                  {item.status === 'out-of-stock' ? (
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                  ) : (
                    <CubeIcon className="h-4 w-4 text-yellow-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <Badge className={`${statusColors[item.status]} text-xs`}>
                      {item.status.replace('-', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{item.category}</span>
                      <span>
                        {item.currentStock} / {item.maxStock} {item.unit}
                      </span>
                    </div>
                    <Progress 
                      value={getStockPercentage(item)} 
                      className="h-1"
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="mt-4 pt-4 border-t space-y-2">
          <Link href="/inventory/stock-levels">
            <Button variant="secondary" className="w-full">
              View Stock Levels
            </Button>
          </Link>
          <Link href="/inventory/purchase-orders/create">
            <Button variant="default" className="w-full">
              Create Purchase Order
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}