import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let tokenPayload: any;
    try {
      tokenPayload = jwt.verify(
        token,
        process.env.JWT_SECRET || 'sua_chave_secreta_temporaria'
      );
    } catch (e) {
      return NextResponse.json({ erro: 'Token inválido ou expirado' }, { status: 401 });
    }

    const body = await request.json();
    const { nome, email, senhaAtual, novaSenha } = body;
    const userId = tokenPayload.id;

    console.log('[PERFIL] Atualizando perfil do usuario:', userId, { nome, email, temSenhaAtual: !!senhaAtual, temNovaSenha: !!novaSenha });

    if (!nome || !email) {
      return NextResponse.json({ erro: 'Nome e email são obrigatórios' }, { status: 400 });
    }

    // Buscar usuário para verificação
    const userResult = await query('SELECT id, email, senha FROM usuarios WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
    }

    const usuarioDb = userResult.rows[0];

    // Se tiver email novo, verificar se já existe
    if (email !== usuarioDb.email) {
      const emailCheck = await query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return NextResponse.json({ erro: 'Este email já está em uso por outra conta' }, { status: 400 });
      }
    }

    // Construir query dinamicamente
    const setClauses: string[] = ['nome = $1', 'email = $2'];
    const queryParams: any[] = [nome, email];
    let paramIndex = 3;

    // Se ele quiser alterar a senha, verificar a senha atual
    if (novaSenha && novaSenha.trim() !== '') {
      if (!senhaAtual) {
        return NextResponse.json({ erro: 'A senha atual é necessária para definir uma nova senha' }, { status: 400 });
      }

      const senhaCorreta = await bcrypt.compare(senhaAtual, usuarioDb.senha);
      if (!senhaCorreta) {
        return NextResponse.json({ erro: 'Senha atual incorreta' }, { status: 400 });
      }

      const hash = await bcrypt.hash(novaSenha, 10);
      setClauses.push(`senha = $${paramIndex}`);
      queryParams.push(hash);
      paramIndex++;
    }

    // O userId sempre vai no final
    queryParams.push(userId);
    const whereParam = `$${paramIndex}`;

    const sql = `UPDATE usuarios SET ${setClauses.join(', ')} WHERE id = ${whereParam}`;
    console.log('[PERFIL] SQL:', sql, 'Params count:', queryParams.length);

    await query(sql, queryParams);

    // Gerar um NOVO token porque o nome/email mudaram
    const novoToken = jwt.sign(
      {
        id: userId,
        email: email,
        nome: nome
      },
      process.env.JWT_SECRET || 'sua_chave_secreta_temporaria',
      { expiresIn: '7d' }
    );

    console.log('[PERFIL] Perfil atualizado com sucesso para usuario:', userId);

    return NextResponse.json(
      {
        mensagem: 'Perfil atualizado com sucesso',
        token: novoToken,
        usuario: { id: userId, nome, email }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[PERFIL] Erro ao atualizar perfil:', error?.message || error);
    return NextResponse.json(
      { erro: `Erro ao atualizar perfil: ${error?.message || 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
}
