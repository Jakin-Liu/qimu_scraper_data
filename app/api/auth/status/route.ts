import { NextRequest, NextResponse } from 'next/server'
import { authManager } from '@/lib/fastmoss-scraper'

export async function GET(request: NextRequest) {
  try {
    const currentAuth = authManager.getCurrentAuth()
    const isValid = authManager.isAuthValid()
    
    if (!currentAuth) {
      return NextResponse.json({
        authenticated: false,
        message: '未登录'
      })
    }

    // 检查用户是否真正登录
    const isUserLoggedIn = await authManager.checkUserLogin()
    
    const timeRemaining = isValid 
      ? Math.max(0, 3600000 - (Date.now() - currentAuth.timestamp))
      : 0

    return NextResponse.json({
      authenticated: true,
      valid: isValid,
      userLoggedIn: isUserLoggedIn,
      timestamp: currentAuth.timestamp,
      timeRemaining: timeRemaining,
      timeRemainingMinutes: Math.floor(timeRemaining / 60000),
      fd_tk: currentAuth.fd_tk.substring(0, 10) + '...', // 只显示前10个字符
      fm_sign: currentAuth.fm_sign.substring(0, 10) + '...' // 只显示前10个字符
    })
  } catch (error) {
    // 是
    console.error('获取认证状态失败:', error)
    return NextResponse.json({ 
      error: "获取认证状态失败" 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 强制刷新认证信息
    const authInfo = await authManager.getAuthInfo()
    
    return NextResponse.json({
      message: '认证信息已刷新',
      authenticated: true,
      timestamp: authInfo.timestamp,
      fd_tk: authInfo.fd_tk.substring(0, 10) + '...',
      fm_sign: authInfo.fm_sign.substring(0, 10) + '...'
    })
  } catch (error) {
    console.error('刷新认证信息失败:', error)
    return NextResponse.json({ 
      error: "刷新认证信息失败" 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    authManager.clearAuth()
    
    return NextResponse.json({
      message: '认证信息已清除',
      authenticated: false
    })
  } catch (error) {
    console.error('清除认证信息失败:', error)
    return NextResponse.json({ 
      error: "清除认证信息失败" 
    }, { status: 500 })
  }
}
