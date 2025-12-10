// app/about/page.tsx
import UserManagementClient from "./client-component";

// 定义数据类型
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// 模拟服务端获取数据
async function getUsers(): Promise<User[]> {
  // 模拟异步获取数据
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 返回模拟数据
  return [
    { id: "1", name: "张三", email: "zhangsan@example.com", role: "管理员" },
    { id: "2", name: "李四", email: "lisi@example.com", role: "用户" },
    { id: "3", name: "王五", email: "wangwu@example.com", role: "用户" },
  ];
}

// 模拟API调用
export const mockApi = {
  // 删除用户
  deleteUser: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 300);
    });
  },
  
  // 更新用户
  updateUser: async (user: User): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(user);
      }, 300);
    });
  },
  
  // 创建用户
  createUser: async (user: Omit<User, "id">): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Date.now().toString(),
          ...user
        });
      }, 300);
    });
  }
};

// 服务端组件部分（页面默认导出）
export default async function UserManagementPage() {
  const users = await getUsers();
  
  return <UserManagementClient initialUsers={users} />;
}