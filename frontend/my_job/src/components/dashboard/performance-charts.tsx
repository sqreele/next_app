// src/components/dashboard/performance-charts.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// Sample data for charts
const weeklyData = [
  { day: 'Mon', completed: 12, created: 8 },
  { day: 'Tue', completed: 15, created: 12 },
  { day: 'Wed', completed: 8, created: 14 },
  { day: 'Thu', completed: 18, created: 10 },
  { day: 'Fri', completed: 22, created: 16 },
  { day: 'Sat', completed: 5, created: 3 },
  { day: 'Sun', completed: 3, created: 2 },
]

const priorityData = [
  { name: 'Low', value: 35, color: '#9CA3AF' },
  { name: 'Medium', value: 40, color: '#3B82F6' },
  { name: 'High', value: 20, color: '#F59E0B' },
  { name: 'Urgent', value: 5, color: '#EF4444' },
]

// src/components/dashboard/performance-charts.tsx (continued)
const monthlyTrend = [
    { month: 'Jan', workOrders: 145, avgTime: 4.2 },
    { month: 'Feb', workOrders: 162, avgTime: 3.8 },
    { month: 'Mar', workOrders: 178, avgTime: 4.1 },
    { month: 'Apr', workOrders: 156, avgTime: 3.5 },
    { month: 'May', workOrders: 189, avgTime: 3.9 },
    { month: 'Jun', workOrders: 201, avgTime: 3.2 },
   ]
   
   export function PerformanceCharts() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="weekly" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="weekly">Weekly Overview</TabsTrigger>
              <TabsTrigger value="priority">Priority Distribution</TabsTrigger>
              <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
            </TabsList>
   
            <TabsContent value="weekly" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" fill="#10B981" name="Completed" />
                    <Bar dataKey="created" fill="#3B82F6" name="Created" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Completed Work Orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>New Work Orders</span>
                </div>
              </div>
            </TabsContent>
   
            <TabsContent value="priority" className="space-y-4">
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {priorityData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <Badge variant="secondary">{item.value}%</Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
   
            <TabsContent value="trends" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="workOrders" fill="#3B82F6" name="Work Orders" />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="avgTime" 
                      stroke="#F59E0B" 
                      strokeWidth={3}
                      name="Avg Resolution Time (hrs)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Monthly Work Orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Avg Resolution Time</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    )
   }