from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import require_role
from app.database import get_session
from app.models.user import User, TeacherStudentLink, StudentSettings
from app.models.activity import Activity

router = APIRouter(prefix="/teacher", tags=["teacher"])

_teacher = require_role("teacher")


@router.get("/students", summary="Listar alunos", description="Retorna todos os alunos vinculados ao professor autenticado, incluindo suas configurações de leitura.")
def list_students(
    current_user: User = Depends(_teacher),
    session: Session = Depends(get_session),
):
    links = session.exec(
        select(TeacherStudentLink).where(TeacherStudentLink.teacher_id == current_user.id)
    ).all()

    students = []
    for link in links:
        student = session.get(User, link.student_id)
        settings = session.get(StudentSettings, link.student_id)
        if student:
            students.append({
                "id": student.id,
                "username": student.username,
                "created_at": student.created_at,
                "settings": settings,
            })
    return students


@router.get("/students/{student_id}/activities", summary="Atividades do aluno", description="Retorna todas as atividades adaptadas de um aluno específico. Retorna 403 se o aluno não estiver vinculado ao professor autenticado.")
def get_student_activities(
    student_id: int,
    current_user: User = Depends(_teacher),
    session: Session = Depends(get_session),
):
    link = session.exec(
        select(TeacherStudentLink).where(
            TeacherStudentLink.teacher_id == current_user.id,
            TeacherStudentLink.student_id == student_id,
        )
    ).first()
    if not link:
        raise HTTPException(403, "Aluno nao vinculado a este professor")

    return session.exec(
        select(Activity).where(Activity.student_id == student_id).order_by(Activity.created_at.desc())
    ).all()
