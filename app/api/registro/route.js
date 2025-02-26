import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuração de CORS
const headers = {
  "Access-Control-Allow-Origin": "*",  // Permite requisições de qualquer origem
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",  // Métodos permitidos
  "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Cabeçalhos permitidos
};

// Lida com requisições OPTIONS para CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers
  });
}

// Registro de usuário
export async function POST(req) {
  try {
    // Obtém os dados da requisição
    const body = await req.json();
    console.log("📩 Dados recebidos:", body);

    // Desestrutura os campos do body
    const { nome, cpf, email, senha, telefone } = body;

    // Verificação de campos obrigatórios
    if (!nome || !cpf || !email || !senha) {
      return new Response(
        JSON.stringify({ message: 'Nome, CPF, email e senha são obrigatórios' }),
        {
          status: 400,
          headers
        }
      );
    }

    // Verifica se o usuário já existe (CPF ou email)
    const existingUser = await prisma.usuarios.findFirst({
      where: {
        OR: [{ email }, { cpf }]
      }
    });

    if (existingUser) {
      return new Response(
        JSON.stringify({ message: 'Usuário já cadastrado com este email ou CPF' }),
        {
          status: 400,
          headers
        }
      );
    }

    // Criptografa a senha
    const hashedSenha = bcrypt.hashSync(senha, 10);

    // Cria o usuário no banco de dados
    const newUser = await prisma.usuarios.create({
      data: {
        nome,
        cpf,
        email,
        senha: hashedSenha,
        telefone: telefone || null,  // Define como null se não for enviado
        endereco: null,              // Mantém opcional
        tipo_usuario: "cliente",     // Define como "cliente" por padrão
        data_criacao: new Date()     // Data de criação atual
      }
    });

    // Verifica se o usuário foi criado corretamente
    if (!newUser || !newUser.id) {
      throw new Error("Erro ao criar usuário no banco de dados");
    }

    // Gera um token JWT para autenticação
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      'secreto',  // Substitua por uma variável de ambiente em produção
      { expiresIn: '1h' }
    );

    // Resposta de sucesso
    return new Response(
      JSON.stringify({
        status: "success",
        message: "Usuário registrado com sucesso",
        data: { token }
      }, null, 2),  // Indenta o JSON para melhor leitura
      {
        status: 201,
        headers
      }
    );

  } catch (error) {
    console.error("❌ Erro no servidor:", error);

    return new Response(
      JSON.stringify({
        message: 'Erro no servidor',
        error: error.message
      }),
      {
        status: 500,
        headers
      }
    );
  }
}
