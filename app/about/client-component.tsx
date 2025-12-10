// app/about/client-component.tsx
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  PlusCircle, 
  Pencil, 
  Trash2, 
  Save 
} from "lucide-react";
import { toast } from "sonner";
import { User, mockApi } from "./page";

interface UserManagementClientProps {
  initialUsers: User[];
}

export default function UserManagementClient({ initialUsers }: UserManagementClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Omit<User, "id">>({
    name: "",
    email: "",
    role: "用户",
  });
  const [isLoading, setIsLoading] = useState(false);

  // 打开新增对话框
  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", role: "用户" });
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  // 打开删除确认对话框
  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  // 确认删除用户
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    
    setIsLoading(true);
    try {
      // 模拟API调用
      await mockApi.deleteUser(userToDelete.id);
      
      // 更新本地状态
      setUsers(users.filter(user => user.id !== userToDelete.id));
      
      // 显示成功消息
      toast.success("用户删除成功");
    } catch (error) {
      toast.error("删除用户失败");
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // 保存用户（新增或更新）
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (editingUser) {
        // 更新用户
        const updatedUser = await mockApi.updateUser({
          ...editingUser,
          ...formData
        });
        
        // 更新本地状态
        setUsers(users.map(user => 
          user.id === editingUser.id 
            ? updatedUser 
            : user
        ));
        
        toast.success("用户更新成功");
      } else {
        // 新增用户
        const newUser = await mockApi.createUser(formData);
        
        // 更新本地状态
        setUsers([...users, newUser]);
        
        toast.success("用户创建成功");
      }
    } catch (error) {
      toast.error(editingUser ? "更新用户失败" : "创建用户失败");
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }
  };

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mx-auto py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">用户管理</h1>
          <Button onClick={handleCreate}>
            <PlusCircle className="mr-2 h-4 w-4" />
            添加用户
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 编辑/新增对话框 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "编辑用户" : "添加用户"}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? "修改用户信息，点击保存完成更改" 
                  : "填写新用户信息，点击保存添加用户"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  姓名
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  邮箱
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  角色
                </Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="col-span-3 border rounded-md px-3 py-2"
                >
                  <option value="用户">用户</option>
                  <option value="管理员">管理员</option>
                </select>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  "保存中..."
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                您确定要删除用户 "<strong>{userToDelete?.name}</strong>" 吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete} 
                disabled={isLoading}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isLoading ? "删除中..." : "确认删除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
}